import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // Your email
        pass: process.env.SMTP_PASS  // Your email password or app-specific password
    }
});

// Function to send order status change email
export async function sendOrderStatusEmail(userEmail, orderData, newStatus) {
    // If no email provided, skip sending
    if (!userEmail) {
        console.log('No email provided for order notification');
        return { success: false, message: 'No email address' };
    }

    try {
        // Get frontend URL from environment or use default
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        // Status-specific email content
        const statusContent = {
            pending: {
                subject: `Order ${orderData.orderId} - Awaiting Confirmation`,
                message: 'Your order has been received and is awaiting confirmation from our team.'
            },
            accepted: {
                subject: `Order ${orderData.orderId} - Confirmed! Complete Your Payment`,
                message: 'Great news! Your order has been confirmed and accepted. Please complete your payment to proceed with delivery.'
            },
            preparing: {
                subject: `Order ${orderData.orderId} - Being Prepared`,
                message: 'Your order is now being prepared with care.'
            },
            shipped: {
                subject: `Order ${orderData.orderId} - On Its Way!`,
                message: 'Your order has been shipped and is on its way to you.'
            },
            delivered: {
                subject: `Order ${orderData.orderId} - Delivered Successfully`,
                message: 'Your order has been delivered. We hope you enjoy your purchase!'
            },
            cancelled: {
                subject: `Order ${orderData.orderId} - Cancelled`,
                message: 'Your order has been cancelled. If you have any questions, please contact us.'
            }
        };

        const content = statusContent[newStatus] || {
            subject: `Order ${orderData.orderId} - Status Update`,
            message: `Your order status has been updated to: ${newStatus}`
        };

        // Generate payment link for accepted orders
        const paymentLink = `${frontendUrl}/payment/${orderData.orderId}`;
        
        // Create payment button HTML for accepted orders
        const paymentButtonHtml = newStatus === 'accepted' ? `
            <div style="text-align: center; margin: 30px 0;">
                <a href="${paymentLink}" 
                   style="display: inline-block; background-color: #10b981; color: white; 
                          padding: 15px 40px; text-decoration: none; border-radius: 8px; 
                          font-weight: bold; font-size: 16px;">
                    💳 Complete Payment Now
                </a>
                <p style="margin-top: 15px; font-size: 14px; color: #666;">
                    Click the button above to view your invoice and make payment
                </p>
            </div>
        ` : '';

        // Email HTML template
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #f97316; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
                    .status-badge { display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
                    .order-details { background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #f97316; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                    .payment-notice { background-color: #fff3cd; border: 2px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Udari Online Shop</h1>
                        <p>Order Status Update</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${orderData.name}!</h2>
                        <p>${content.message}</p>
                        
                        <div class="status-badge">Status: ${newStatus.toUpperCase()}</div>
                        
                        ${newStatus === 'accepted' ? `
                            <div class="payment-notice">
                                <h3 style="margin-top: 0; color: #856404;">⚠️ Payment Required</h3>
                                <p style="margin: 10px 0; color: #856404;">
                                    Your order has been accepted! To proceed with ${orderData.deliveryOption === 'delivery' ? 'delivery' : 'pickup'}, 
                                    please complete your payment using the button below.
                                </p>
                            </div>
                            ${paymentButtonHtml}
                        ` : ''}
                        
                        <div class="order-details">
                            <h3>Order Details</h3>
                            <p><strong>Order ID:</strong> ${orderData.orderId}</p>
                            <p><strong>Order Date:</strong> ${new Date(orderData.date).toLocaleDateString()}</p>
                            <p><strong>Delivery Option:</strong> ${orderData.deliveryOption === 'delivery' ? 'Home Delivery' : 'Pick Up'}</p>
                            <p><strong>WhatsApp:</strong> ${orderData.whatsappNumber}</p>
                        </div>
                        
                        <p>If you have any questions about your order, please contact us via WhatsApp or phone.</p>
                        
                        <p>Thank you for choosing Udari Online Shop!</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} Udari Online Shop. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send email
        const info = await transporter.sendMail({
            from: `"Udari Online Shop" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: content.subject,
            html: htmlContent
        });

        console.log('Email sent successfully:', info.messageId);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
}

// Test email configuration
export async function testEmailConfiguration() {
    try {
        await transporter.verify();
        console.log('SMTP server is ready to send emails');
        return true;
    } catch (error) {
        console.error('SMTP configuration error:', error);
        return false;
    }
}

//zaux vmnk zhqw fppd