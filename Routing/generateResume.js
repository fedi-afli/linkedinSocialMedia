const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper function to convert image file to base64
function getBase64Image(imagePath) {
    try {
        const fullPath = path.join(__dirname, '..', imagePath);
        if (fs.existsSync(fullPath)) {
            const imageData = fs.readFileSync(fullPath);
            return 'data:image/png;base64,' + imageData.toString('base64');
        }
    } catch (error) {
        console.error('Error reading image:', error);
    }
    return null;
}

// Download Resume Route - for downloading other users' resumes
router.get('/download-resume/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Check if user has a resume
        if (!user.resume) {
            return res.status(404).json({ success: false, message: 'Resume not available' });
        }

        // Construct the full file path
        const resumeFilePath = path.join(__dirname, '..', user.resume);

        // Security check: ensure the resume path is within uploads/resumes directory
        const uploadsResumesDir = path.join(__dirname, '../uploads/resumes');
        const normalizedPath = path.normalize(resumeFilePath);
        const normalizedUploadsDir = path.normalize(uploadsResumesDir);

        if (!normalizedPath.startsWith(normalizedUploadsDir)) {
            return res.status(403).json({ success: false, message: 'Invalid resume path' });
        }

        // Check if file exists
        if (!fs.existsSync(resumeFilePath)) {
            return res.status(404).json({ success: false, message: 'Resume file not found' });
        }

        // Download the file
        res.download(resumeFilePath, `${user.username}_Resume.pdf`, (err) => {
            if (err) console.error('Download error:', err);
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Generate Resume Route
router.get('/generate-resume', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Convert profile picture to base64
        let profilePicBase64 = null;
        if (user.profilePicture) {
            profilePicBase64 = getBase64Image(user.profilePicture);
        }

        // Format dates properly
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        };

        // Create a more structured and visually appealing HTML for the resume
        const resumeHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: #2c3e50;
                        line-height: 1.6;
                        background-color: #f5f5f5;
                    }
                    
                    .container {
                        max-width: 850px;
                        margin: 0 auto;
                        background-color: white;
                        padding: 40px;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 35px;
                        padding-bottom: 25px;
                        border-bottom: 3px solid #2f81f7;
                    }
                    
                    .profile-pic {
                        width: 120px;
                        height: 120px;
                        border-radius: 50%;
                        margin: 0 auto 15px;
                        display: block;
                        border: 4px solid #2f81f7;
                        object-fit: cover;
                    }
                    
                    h1 {
                        font-size: 32px;
                        font-weight: 700;
                        color: #1a1a1a;
                        margin: 10px 0;
                    }
                    
                    .headline {
                        font-size: 16px;
                        color: #2f81f7;
                        font-weight: 600;
                        margin-bottom: 12px;
                    }
                    
                    .contact-info {
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        font-size: 12px;
                        color: #555;
                        flex-wrap: wrap;
                        margin-top: 10px;
                    }
                    
                    .contact-info p {
                        margin: 0;
                    }
                    
                    .section {
                        margin-top: 25px;
                        page-break-inside: avoid;
                    }
                    
                    .section-title {
                        font-size: 16px;
                        font-weight: 700;
                        color: white;
                        background-color: #2f81f7;
                        padding: 10px 15px;
                        margin-bottom: 12px;
                        border-radius: 4px;
                    }
                    
                    .section-content {
                        margin-left: 0;
                    }
                    
                    .about-text {
                        font-size: 13px;
                        line-height: 1.7;
                        color: #333;
                        margin-bottom: 8px;
                    }
                    
                    .work-text {
                        font-size: 13px;
                        color: #555;
                        margin-bottom: 8px;
                    }
                    
                    .experience-item {
                        margin-bottom: 18px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #e0e0e0;
                        page-break-inside: avoid;
                    }
                    
                    .experience-item:last-child {
                        border-bottom: none;
                    }
                    
                    .job-title {
                        font-size: 14px;
                        font-weight: 700;
                        color: #1a1a1a;
                        margin: 0;
                    }
                    
                    .company-name {
                        font-size: 13px;
                        color: #2f81f7;
                        font-weight: 600;
                        margin: 3px 0;
                    }
                    
                    .job-dates {
                        font-size: 12px;
                        color: #777;
                        font-style: italic;
                        margin: 3px 0;
                    }
                    
                    .job-description {
                        font-size: 12px;
                        color: #555;
                        margin-top: 5px;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        ${profilePicBase64 ? `<img src="${profilePicBase64}" alt="Profile Picture" class="profile-pic">` : ''}
                        <h1>${user.username || 'N/A'}</h1>
                        ${user.headline ? `<p class="headline">${user.headline}</p>` : ''}
                        <div class="contact-info">
                            <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                            ${user.phone ? `<p><strong>Phone:</strong> ${user.phone}</p>` : ''}
                        </div>
                    </div>

                    ${user.bio ? `
                    <div class="section">
                        <div class="section-title">About</div>
                        <div class="section-content">
                            <p class="about-text">${user.bio}</p>
                        </div>
                    </div>
                    ` : ''}

                    ${user.work ? `
                    <div class="section">
                        <div class="section-title">Current Work</div>
                        <div class="section-content">
                            <p class="work-text">${user.work}</p>
                        </div>
                    </div>
                    ` : ''}

                    ${user.experiences && user.experiences.length > 0 ? `
                    <div class="section">
                        <div class="section-title">Experience</div>
                        <div class="section-content">
                            ${user.experiences.map(exp => `
                                <div class="experience-item">
                                    <p class="job-title">${exp.title || 'N/A'}</p>
                                    <p class="company-name">${exp.company || 'N/A'}</p>
                                    <p class="job-dates">${formatDate(exp.startDate)} - ${exp.current ? 'Present' : formatDate(exp.endDate)}</p>
                                    ${exp.description ? `<p class="job-description">${exp.description}</p>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </body>
            </html>
        `;

        // Ensure uploads/resumes directory exists
        const uploadsDir = path.join(__dirname, '../uploads/resumes');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(4).toString('hex');
        const resumeFilename = `resume-${uniqueSuffix}.pdf`;
        const resumePath = path.join(uploadsDir, resumeFilename);
        const resumeDbPath = `/uploads/resumes/${resumeFilename}`;

        // Check if user already has a resume
        if (user.resume) {
            // Delete old resume file
            const oldResumePath = path.join(__dirname, '..', user.resume);
            try {
                if (fs.existsSync(oldResumePath)) {
                    fs.unlinkSync(oldResumePath);
                    console.log('Old resume deleted:', oldResumePath);
                }
            } catch (deleteError) {
                console.error('Error deleting old resume:', deleteError);
            }
        }

        const pdfOptions = {
            format: 'A4',
            orientation: 'portrait',
            border: '0.5in',
            timeout: 30000
        };

        pdf.create(resumeHtml, pdfOptions).toFile(resumePath, async (err, result) => {
            if (err) {
                console.error('PDF generation error:', err);
                return res.status(500).json({ success: false, message: 'Failed to generate PDF' });
            }

            try {
                // Update user document with new resume path
                await User.findByIdAndUpdate(
                    req.user.id,
                    { resume: resumeDbPath },
                    { new: true }
                );

                // Download the file
                res.download(result.filename, `${user.username}_Resume.pdf`, (err) => {
                    if (err) console.error('Download error:', err);
                });
            } catch (dbError) {
                console.error('Database update error:', dbError);
                res.status(500).json({ success: false, message: 'Failed to save resume to database' });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;