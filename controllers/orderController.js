import Order from "../models/order.js";
import Product from "../models/product.js";
import User from "../models/user.js";

// Updated createOrder function that works with authenticated users
export function createOrder(req, res) {
  // Check if user is authenticated (middleware should set req.user)
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "User authentication required"
    });
  }

  const orderData = req.body;
  console.log("Received order data:", JSON.stringify(orderData, null, 2));

  // Validate required fields
  if (!orderData.phone || !orderData.name || !orderData.address ||
    !orderData.deliveryOption || !orderData.whatsappNumber ||
    !orderData.preferredTime || !orderData.preferredDay) {
    return res.status(400).json({
      success: false,
      message: "Missing required order information"
    });
  }

  // Validate orderedItems specifically
  if (!orderData.orderedItems || !Array.isArray(orderData.orderedItems) || orderData.orderedItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: "orderedItems is required and must be a non-empty array"
    });
  }

  // Validate each ordered item
  for (let i = 0; i < orderData.orderedItems.length; i++) {
    const item = orderData.orderedItems[i];

    if (!item.name) {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].name is required`
      });
    }

    if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].price is required and must be a positive number`
      });
    }

    if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].quantity is required and must be a positive number`
      });
    }

    if (!item.productId) {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].productId is required`
      });
    }
  }

  // Generate unique order ID with timestamp to avoid duplicates
  const generateUniqueOrderId = async () => {
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, "0");
    return `ORD${timestamp}${randomNum}`;
  };

  // Create and save the order
  const createAndSaveOrder = async () => {
    try {
      // Generate unique order ID
      const orderId = await generateUniqueOrderId();

      // Create order with user ID
      const newOrder = new Order({
        orderId: orderId,
        userId: req.user.userId,
        phone: orderData.phone,
        name: orderData.name,
        address: orderData.address,
        deliveryOption: orderData.deliveryOption,
        whatsappNumber: orderData.whatsappNumber,
        preferredTime: orderData.preferredTime,
        preferredDay: orderData.preferredDay,
        nearestTownOrCity: orderData.nearestTownOrCity,
        notes: orderData.notes || "",
        orderedItems: orderData.orderedItems,
        status: "preparing"
      });

      // Try to save the order
      try {
        await newOrder.save();
      } catch (saveError) {
        // If duplicate orderId, try one more time with a new ID
        if (saveError.code === 11000 && saveError.keyPattern && saveError.keyPattern.orderId) {
          console.log("Duplicate orderId detected, generating new ID...");
          newOrder.orderId = await generateUniqueOrderId();
          await newOrder.save();
        } else {
          throw saveError;
        }
      }

      // Update product quantities and total ordered
      for (const item of orderData.orderedItems) {
        await Product.findOneAndUpdate(
          { productId: item.productId },
          {
            $inc: {
              quantity: -item.quantity,
              totalOrdered: item.quantity
            }
          }
        );
      }

      res.status(201).json({
        success: true,
        message: "Order created successfully",
        orderId: newOrder.orderId,
        order: newOrder
      });

    } catch (error) {
      console.error("Error creating order:", error);

      // Handle specific error types
      if (error.code === 11000) {
        return res.status(500).json({
          success: false,
          message: "Duplicate order error. Please try again.",
          error: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Failed to create order",
        error: error.message
      });
    }
  };

  // Execute the order creation
  createAndSaveOrder().catch((error) => {
    console.error("Error in order creation process:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process order",
      error: error.message
    });
  });
}

export function getOrders(req, res) {
  // This would need admin authentication
  Order.find().sort({ date: -1 }).then((orders) => {
    res.json({
      success: true,
      orders: orders
    });
  }).catch((error) => {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  });
}

// New function to get user's orders (My Orders page)
export function getMyOrders(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "User authentication required"
    });
  }

  // Find orders for this user
  Order.find({ userId: req.user.userId })
    .sort({ date: -1 }) // Most recent first
    .then((orders) => {
      res.json({
        success: true,
        message: "Orders retrieved successfully",
        orders: orders,
        count: orders.length
      });
    })
    .catch((error) => {
      console.error("Error fetching user orders:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch orders",
        error: error.message
      });
    });
}

// Function to get a specific order by ID (for order details)
export function getOrderById(req, res) {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({
      success: false,
      message: "User authentication required"
    });
  }

  const orderId = req.params.orderId;

  Order.findOne({
    orderId: orderId,
    userId: req.user.userId // Ensure order belongs to this user
  }).then((order) => {
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied"
      });
    }

    res.json({
      success: true,
      message: "Order retrieved successfully",
      order: order
    });
  }).catch((error) => {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message
    });
  });
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
    // Aggregate orders to calculate actual product statistics
    const productStats = await Order.aggregate([
      {
        $unwind: "$orderedItems"
      },
      {
        $group: {
          _id: "$orderedItems.productId",
          totalQuantityOrdered: { $sum: "$orderedItems.quantity" },
          productName: { $first: "$orderedItems.name" },
          productImage: { $first: "$orderedItems.image" }
        }
      },
      {
        $sort: { totalQuantityOrdered: -1 }
      }
    ]);

    // If no orders exist, get all products with 0 orders
    if (productStats.length === 0) {
      const products = await Product.find({}, {
        productName: 1,
        images: 1,
        productId: 1,
        _id: 1
      }).sort({ productName: 1 });

      const emptyStats = products.map(product => ({
        productId: product.productId,
        productName: product.productName,
        productImage: product.images && product.images.length > 0 ? product.images[0] : null,
        totalQuantityOrdered: 0
      }));

      return res.json({
        message: "No orders found. Showing all products with 0 orders.",
        products: emptyStats
      });
    }

    // Format the aggregated data
    const formattedStats = productStats.map(stat => ({
      productId: stat._id,
      productName: stat.productName,
      productImage: stat.productImage,
      totalQuantityOrdered: stat.totalQuantityOrdered
    }));

    res.json({
      message: "Product order statistics retrieved successfully",
      products: formattedStats
    });
  } catch (error) {
    console.error("Error fetching product order statistics:", error);
    res.status(500).json({
      message: "Error fetching product order statistics",
      error: error.message
    });
  }
}