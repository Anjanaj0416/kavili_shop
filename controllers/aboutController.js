import About from "../models/about.js";

// Get about information
export function getAboutInfo(req, res) {
    About.findOne()
        .then((about) => {
            if (!about) {
                // Return default values if no about exists
                return res.json({
                    success: true,
                    about: {
                        companyOverview: {
                            title: "Welcome to Udari Online Shop",
                            description: "We are a leading spice retailer providing high-quality authentic spices to homes across Sri Lanka. Our commitment to quality and customer satisfaction sets us apart.",
                            images: []
                        },
                        story: {
                            title: "Our Story",
                            description: "Founded with a passion for authentic flavors, Udari Online Shop began as a small family business with a mission to bring the finest spices directly to your kitchen. Over the years, we have grown into a trusted name in the spice industry, maintaining our commitment to quality and authenticity."
                        },
                        teamMembers: []
                    }
                });
            }
            res.json({
                success: true,
                about: about
            });
        })
        .catch((error) => {
            console.error("Error fetching about info:", error);
            res.status(500).json({
                success: false,
                message: "Failed to fetch about information",
                error: error.message
            });
        });
}

// Update about information (Admin only)
export function updateAboutInfo(req, res) {
    // Check if user is admin
    if (!req.user || req.user.type !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required."
        });
    }

    const aboutData = req.body;

    console.log("Received about data update request");
    console.log("Data size:", JSON.stringify(aboutData).length, "characters");
    console.log("Number of company images:", aboutData.companyOverview?.images?.length || 0);
    console.log("Number of team members:", aboutData.teamMembers?.length || 0);

    // Validate required fields
    if (!aboutData.companyOverview || !aboutData.companyOverview.title || !aboutData.companyOverview.description) {
        return res.status(400).json({
            success: false,
            message: "Company overview title and description are required"
        });
    }

    if (!aboutData.story || !aboutData.story.title || !aboutData.story.description) {
        return res.status(400).json({
            success: false,
            message: "Story title and description are required"
        });
    }

    // Update lastUpdated timestamp
    aboutData.lastUpdated = new Date();

    // Find and update or create new about document
    About.findOne()
        .then((existingAbout) => {
            if (existingAbout) {
                // Update existing about
                return About.findByIdAndUpdate(
                    existingAbout._id,
                    aboutData,
                    { new: true, runValidators: true }
                );
            } else {
                // Create new about
                const newAbout = new About(aboutData);
                return newAbout.save();
            }
        })
        .then((updatedAbout) => {
            res.json({
                success: true,
                message: "About information updated successfully",
                about: updatedAbout
            });
        })
        .catch((error) => {
            console.error("Error updating about info:");
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
            
            // Check if it's a validation error
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    message: "Validation error",
                    error: error.message
                });
            }
            
            // Check if it's a document size error
            if (error.message && error.message.includes('too large')) {
                return res.status(413).json({
                    success: false,
                    message: "Document too large. Please compress images or reduce the number of images.",
                    error: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: "Failed to update about information. Check server logs for details.",
                error: error.message
            });
        });
}

// Initialize default about information (for first time setup)
export function initializeAboutInfo(req, res) {
    // Check if user is admin
    if (!req.user || req.user.type !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required."
        });
    }

    About.findOne()
        .then((existingAbout) => {
            if (existingAbout) {
                return res.json({
                    success: true,
                    message: "About information already exists",
                    about: existingAbout
                });
            }

            // Create default about
            const defaultAbout = new About({
                companyOverview: {
                    title: "Welcome to Udari Online Shop",
                    description: "We are a leading spice retailer providing high-quality authentic spices to homes across Sri Lanka. Our commitment to quality and customer satisfaction sets us apart.",
                    images: []
                },
                story: {
                    title: "Our Story",
                    description: "Founded with a passion for authentic flavors, Udari Online Shop began as a small family business with a mission to bring the finest spices directly to your kitchen. Over the years, we have grown into a trusted name in the spice industry, maintaining our commitment to quality and authenticity."
                },
                teamMembers: []
            });

            return defaultAbout.save();
        })
        .then((about) => {
            res.json({
                success: true,
                message: "Default about information initialized",
                about: about
            });
        })
        .catch((error) => {
            console.error("Error initializing about info:", error);
            res.status(500).json({
                success: false,
                message: "Failed to initialize about information",
                error: error.message
            });
        });
}