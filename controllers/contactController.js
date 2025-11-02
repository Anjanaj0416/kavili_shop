import Contact from "../models/contact.js";

// Get contact information
export function getContactInfo(req, res) {
    Contact.findOne()
        .then((contact) => {
            if (!contact) {
                // Return default values if no contact exists
                return res.json({
                    success: true,
                    contact: {
                        shopName: "Udari Online Shop",
                        address: "369/1/1, Kendaliyadda paluwa , Ganemulla.",
                        phoneNumbers: [
                            { type: "mobile", number: "+94 77 123 456" },
                            { type: "mobile", number: "+94 77 123 456" },
                            { type: "landline", number: "+94 77 123 456" },
                            { type: "landline", number: "+94 77 123 456" }
                        ],
                        email: "anjan@.com"
                    }
                });
            }
            res.json({
                success: true,
                contact: contact
            });
        })
        .catch((error) => {
            console.error("Error fetching contact info:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch contact information",
                error: error.message
            });
        });
}

// Update contact information (Admin only)
export function updateContactInfo(req, res) {
    // Check if user is admin
    if (!req.user || req.user.type !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required."
        });
    }

    const contactData = req.body;

    // Validate required fields
    if (!contactData.shopName || !contactData.address || !contactData.email) {
        return res.status(400).json({
            success: false,
            message: "Shop name, address, and email are required"
        });
    }

    // Validate phone numbers
    if (!contactData.phoneNumbers || contactData.phoneNumbers.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one phone number is required"
        });
    }

    // Update lastUpdated timestamp
    contactData.lastUpdated = new Date();

    // Find and update or create new contact document
    Contact.findOne()
        .then((existingContact) => {
            if (existingContact) {
                // Update existing contact
                return Contact.findByIdAndUpdate(
                    existingContact._id,
                    contactData,
                    { new: true, runValidators: true }
                );
            } else {
                // Create new contact
                const newContact = new Contact(contactData);
                return newContact.save();
            }
        })
        .then((updatedContact) => {
            res.json({
                success: true,
                message: "Contact information updated successfully",
                contact: updatedContact
            });
        })
        .catch((error) => {
            console.error("Error updating contact info:", error);
            res.status(500).json({
                success: false,
                message: "Failed to update contact information",
                error: error.message
            });
        });
}

// Initialize default contact information (for first time setup)
export function initializeContactInfo(req, res) {
    // Check if user is admin
    if (!req.user || req.user.type !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required."
        });
    }

    Contact.findOne()
        .then((existingContact) => {
            if (existingContact) {
                return res.json({
                    success: true,
                    message: "Contact information already exists",
                    contact: existingContact
                });
            }

            // Create default contact
            const defaultContact = new Contact({
                shopName: "Udari Online Shop",
                address: "369/1/1, Kendaliyadda paluwa , Ganemulla.",
                phoneNumbers: [
                    { type: "mobile", number: "+94 77 123 456" },
                    { type: "mobile", number: "+94 77 123 456" },
                    { type: "landline", number: "+94 77 123 456" },
                    { type: "landline", number: "+94 77 123 456" }
                ],
                email: "anjan@.com"
            });

            return defaultContact.save();
        })
        .then((contact) => {
            res.json({
                success: true,
                message: "Default contact information initialized",
                contact: contact
            });
        })
        .catch((error) => {
            console.error("Error initializing contact info:", error);
            res.status(500).json({
                success: false,
                message: "Failed to initialize contact information",
                error: error.message
            });
        });
}