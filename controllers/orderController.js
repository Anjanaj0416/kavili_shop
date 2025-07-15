import Order from "../models/order.js";
import Product from "../models/product.js";

export async function createOrder(req, res) {
  try {
    const latestOrder = await Order.find().sort({ orderId: -1 }).limit(1);
    console.log(latestOrder);
    let orderId;
    if (latestOrder.length == 0) {
      orderId = "CBC0001";
    } else {
      const currentOrderId = latestOrder[0].orderId;
      const numberString = currentOrderId.replace("CBC", "");
      const number = parseInt(numberString);
      const newNumber = (number + 1).toString().padStart(4, "0");
      orderId = "CBC" + newNumber;
    }
    
    const newOrderData = req.body;
    const newProductArray = [];
    
    // Validate delivery option
    if (!newOrderData.deliveryOption || !["pickup", "delivery"].includes(newOrderData.deliveryOption)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery option. Must be 'pickup' or 'delivery'"
      });
    }
    
    // Validate required fields based on delivery option
    const requiredFields = ["name", "phone", "whatsappNumber", "preferredTime", "preferredDay"];
    
    if (newOrderData.deliveryOption === "delivery") {
      requiredFields.push("address", "nearestTownOrCity");
    }
    
    for (const field of requiredFields) {
      if (!newOrderData[field] || !newOrderData[field].toString().trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required for ${newOrderData.deliveryOption} orders`
        });
      }
    }
    
    // Validate all products first before processing
    for (let i = 0; i < newOrderData.orderedItems.length; i++) {
      const product = await Product.findOne({
        productId: newOrderData.orderedItems[i].productId,
      });
      if (product == null) {
        return res.status(400).json({
          success: false,
          message:
            "Product with id " +
            newOrderData.orderedItems[i].productId +
            " not found",
        });
      }
      newProductArray[i] = {
        name: product.productName,
        price: product.lastPrice,
        quantity: newOrderData.orderedItems[i].qty,
        image: product.images[0],
        productId: newOrderData.orderedItems[i].productId, // Keep productId for tracking
      };
    }
    
    console.log(newProductArray);
    newOrderData.orderedItems = newProductArray;
    newOrderData.orderId = orderId;
    newOrderData.status = "preparing"; // Set default status
    
    // Ensure address is set for pickup orders
    if (newOrderData.deliveryOption === "pickup" && !newOrderData.address) {
      newOrderData.address = "Pickup";
    }
    
    const order = new Order(newOrderData);
    const savedOrder = await order.save();
    
    // Update totalOrdered for each product when order is placed
    for (let item of newOrderData.orderedItems) {
      await Product.updateOne(
        { productId: item.productId },
        { $inc: { totalOrdered: item.quantity } }
      );
    }
    
    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: savedOrder
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
}

export async function getOrders(req, res) {
  try {
    // This function would need authentication for admin access
    // For now, returning all orders (you might want to modify this based on your needs)
    const orders = await Order.find({});
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
}

export async function getQuote(req, res) {
  try {
    const newOrderData = req.body;
    const newProductArray = [];
    let total = 0;
    let labelTotal = 0;
    
    for (let i = 0; i < newOrderData.orderedItems.length; i++) {
      const product = await Product.findOne({
        productId: newOrderData.orderedItems[i].productId,
      });
      if (product == null) {
        res.json({
          message:
            "Product with id " +
            newOrderData.orderedItems[i].productId +
            " not found",
        });
        return;
      }
      total += product.lastPrice * newOrderData.orderedItems[i].qty;
      labelTotal += product.price * newOrderData.orderedItems[i].qty;
      newProductArray[i] = {
        name: product.productName,
        price: product.lastPrice,
        labelPrice: product.price, // Fixed typo from 'ladelPrice'
        discount: product.price - product.lastPrice,
        quantity: newOrderData.orderedItems[i].qty,
        image: product.images[0],
      };
    }
    
    console.log(newProductArray);
    res.json({
      orderedItems: newProductArray, // Fixed typo from 'orederedItems'
      total: total,
      labelTotal: labelTotal,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
}

export async function updateOrderStatus(req, res) {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        // Validate status
        const validStatuses = ["preparing", "shipped", "delivered", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Must be one of: " + validStatuses.join(", ")
            });
        }
        
        // Get the current order to check previous status
        const currentOrder = await Order.findById(orderId);
        if (!currentOrder) {
            return res.status(404).json({
                message: "Order not found"
            });
        }
        
        const previousStatus = currentOrder.status;
        
        // Update the order status
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: status },
            { new: true }
        );
        
        // Handle totalOrdered updates based on status changes
        if (status === "delivered" && previousStatus !== "delivered") {
            // When order is marked as delivered, decrease totalOrdered
            for (let item of currentOrder.orderedItems) {
                if (item.productId) {
                    await Product.updateOne(
                        { productId: item.productId },
                        { $inc: { totalOrdered: -item.quantity } }
                    );
                }
            }
        } else if (previousStatus === "delivered" && status !== "delivered") {
            // If order was previously delivered but now changed to another status, increase totalOrdered
            for (let item of currentOrder.orderedItems) {
                if (item.productId) {
                    await Product.updateOne(
                        { productId: item.productId },
                        { $inc: { totalOrdered: item.quantity } }
                    );
                }
            }
        }
        
        res.json({
            message: "Order status updated successfully",
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

export async function deleteOrder(req, res) {
    try {
        const { orderId } = req.params;
        
        // Get the order before deleting to update product totals
        const orderToDelete = await Order.findById(orderId);
        if (!orderToDelete) {
            return res.status(404).json({
                message: "Order not found"
            });
        }
        
        // If order was not delivered, decrease totalOrdered for each product
        if (orderToDelete.status !== "delivered") {
            for (let item of orderToDelete.orderedItems) {
                if (item.productId) {
                    await Product.updateOne(
                        { productId: item.productId },
                        { $inc: { totalOrdered: -item.quantity } }
                    );
                }
            }
        }
        
        const deletedOrder = await Order.findByIdAndDelete(orderId);
        
        res.json({
            message: "Order deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
}

// New function to get product order statistics for admin dashboard
export async function getProductOrderStats(req, res) {
    try {
        const products = await Product.find({}, {
            productName: 1,
            images: 1,
            totalOrdered: 1,
            _id: 1
        }).sort({ totalOrdered: -1 });
        
        const productStats = products.map(product => ({
            productId: product._id,
            productName: product.productName,
            productImage: product.images && product.images.length > 0 ? product.images[0] : null,
            totalQuantityOrdered: product.totalOrdered || 0
        }));
        
        res.json({
            message: "Product order statistics retrieved successfully",
            products: productStats
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching product order statistics",
            error: error.message
        });
    }
}


