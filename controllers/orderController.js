import Order from "../models/order.js";
import Product from "../models/product.js";
import User from "../models/user.js";
import { sendOrderStatusEmail } from "../utils/emailService.js";

// Helper function to generate unique order ID
async function generateUniqueOrderId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

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

    if (!item.price || typeof item.price !== 'number') {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].price is required and must be a number`
      });
    }

    if (!item.quantity || typeof item.quantity !== 'number') {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].quantity is required and must be a number`
      });
    }

    if (!item.productId) {
      return res.status(400).json({
        success: false,
        message: `orderedItems[${i}].productId is required`
      });
    }
  }

  // Async function to create and save the order
  const createAndSaveOrder = async () => {
    try {
      // Generate unique order ID
      const orderId = await generateUniqueOrderId();
      console.log("Generated orderId:", orderId);

      // Get user information
      const user = await User.findOne({ userId: req.user.userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const { phone, deliveryOption, whatsappNumber, preferredTime, preferredDay, nearestTownOrCity } = orderData;

      // Create new order with pending status
      const newOrder = new Order({
        orderId: orderId,
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        phonenumber: user.phonenumber,
        phone: phone,
        name: orderData.name,
        address: orderData.address,
        deliveryOption: deliveryOption,
        whatsappNumber: whatsappNumber,
        preferredTime: preferredTime,
        preferredDay: orderData.preferredDay,
        nearestTownOrCity: orderData.nearestTownOrCity,
        notes: orderData.notes || "",
        orderedItems: orderData.orderedItems,
        status: "pending"
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

      // Send email notification if user has email
      if (user.email) {
        console.log(`Sending order confirmation email to: ${user.email}`);
        sendOrderStatusEmail(user.email, newOrder, "pending").catch(err => {
          console.error('Failed to send email notification:', err);
        });
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

  // Call the async function
  createAndSaveOrder();
}

export function getOrders(req, res) {
  Order.find()
    .sort({ date: -1 })
    .then((orders) => {
      res.json({
        success: true,
        message: "Orders fetched successfully",
        orders: orders,
      });
    })
    .catch((error) => {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    });
}

export async function getMyOrders(req, res) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }

    const orders = await Order.find({ userId: req.user.userId })
      .sort({ date: -1 });

    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required"
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      userId: req.user.userId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

export function getQuote(req, res) {
  try {
    const newOrderData = req.body;
    console.log("Quote request:", newOrderData);

    if (!newOrderData.orderedItems || newOrderData.orderedItems.length === 0) {
      return res.status(400).json({
        message: "No items in order"
      });
    }

    const calculateQuote = async () => {
      let total = 0;
      let labelTotal = 0;
      const newProductArray = [];

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
          labelPrice: product.price,
          discount: product.price - product.lastPrice,
          quantity: newOrderData.orderedItems[i].qty,
          image: product.images[0],
        };
      }

      console.log(newProductArray);
      res.json({
        orderedItems: newProductArray,
        total: total,
        labelTotal: labelTotal,
      });
    };

    calculateQuote();
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
    const validStatuses = ["pending", "accepted", "preparing", "shipped", "delivered", "cancelled"];
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

    // Send email notification if user has email
    const user = await User.findOne({ userId: currentOrder.userId });
    if (user && user.email) {
      console.log(`Sending status update email to: ${user.email}`);
      sendOrderStatusEmail(user.email, updatedOrder, status).catch(err => {
        console.error('Failed to send email notification:', err);
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      order: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

// New function to accept order (shortcut for admin)
export async function acceptOrder(req, res) {
  try {
    const { orderId } = req.params;

    // Get the current order
    const currentOrder = await Order.findById(orderId);
    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    // Check if order is in pending status
    if (currentOrder.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Order is already ${currentOrder.status}. Can only accept pending orders.`
      });
    }

    // Update the order status to accepted
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: "accepted" },
      { new: true }
    );

    // Send email notification if user has email
    const user = await User.findOne({ userId: currentOrder.userId });
    if (user && user.email) {
      console.log(`Sending order acceptance email to: ${user.email}`);
      sendOrderStatusEmail(user.email, updatedOrder, "accepted").catch(err => {
        console.error('Failed to send email notification:', err);
      });
    }

    res.json({
      success: true,
      message: "Order accepted successfully",
      order: updatedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
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
      success: true,
      message: "Order deleted successfully",
      deletedOrder: deletedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
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
        success: true,
        message: "No orders found. Showing all products with 0 orders.",
        products: emptyStats
      });
    }

    res.json({
      success: true,
      message: "Product order statistics fetched successfully",
      products: productStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}