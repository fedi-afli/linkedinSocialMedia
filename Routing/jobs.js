const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Job = require('../models/job'); 
const auth = require('../middleware/auth');
const Conversation = require('../models/conversation'); 
const Message = require('../models/Message');

router.put('/deactivate/:jobId', auth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId);
        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        if (job.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Forbidden' });
        }

        job.isActive = false;
        await job.save();

        res.json({ success: true, message: 'Job deactivated successfully' });
    } catch (error) {
        console.error("Error deactivating job:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const user = req.user ? await User.findById(req.user.id).lean() : null;

        const dbJobs = await Job.find({ isActive: true })
            .sort({ createdAt: -1 })
            .populate('postedBy', 'username profilePicture')
            .lean();

        const formattedJobs = dbJobs
            .filter(job => job.postedBy !== null)
            .map(job => {
            return {
                _id: job._id,
                title: job.title,
                company: job.company,
                location: job.location,
                type: job.type,
                description: job.description,
                time: formatTimeAgo(job.createdAt), 
                logo: 'bg-blue-600', 
                hasApplied: user ? job.applicants.some(a => a.user.toString() === user._id.toString()) : false,
                isOwner: user ? job.postedBy._id.toString() === user._id.toString() : false
            };
        });
        
        res.render('jobs', { 
            user, 
            jobs: formattedJobs 
        });

    } catch (error) {
        console.error("Error fetching jobs:", error);
        res.render('jobs', { user: req.user, jobs: [] });
    }
});

router.post('/create', auth, async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        console.log("Creating job with data:", req.body);
        const { title, company, location, type, description } = req.body;

        const newJob = new Job({
            title,
            company,
            location,
            type,
            description,
            postedBy: req.user.id
        });

        await newJob.save();

        res.json({ success: true, message: 'Job posted successfully!' });
    } catch (error) {
        console.error("Error creating job:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.post('/apply/:jobId', auth, async (req, res) => {
    try {
        const job = await Job.findById(req.params.jobId).populate('postedBy');
        const applicant = await User.findById(req.user.id);

        if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

        const recruiterId = job.postedBy._id;
        if (recruiterId.toString() === req.user.id) return res.status(400).json({ success: false, message: 'Cannot apply to own job' });
        
        const alreadyApplied = job.applicants.some(a => a.user.toString() === req.user.id);
        if (alreadyApplied) return res.status(400).json({ success: false, message: 'Already applied' });

        let conversation = await Conversation.findOne({
            users: { $all: [req.user.id, recruiterId] }
        });

        if (!conversation) {
            conversation = new Conversation({ users: [req.user.id, recruiterId] });
            await conversation.save();
        }

        const lastMsg = await Message.findOne({ conversationId: conversation._id }).sort({ sequenceNumber: -1 });
        const nextSequence = lastMsg ? lastMsg.sequenceNumber + 1 : 1;

        const latestExp = applicant.experiences && applicant.experiences.length > 0 
            ? applicant.experiences.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0] 
            : null;

        const profileLink = `http://${req.headers.host}/profile/${applicant.username}`;
        
        const htmlMessage = `
            <div style="font-family: sans-serif; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; background-color: #f9fafb; max-width: 600px;">
                <h3 style="margin-top: 0; color: #1f2937;">🚀 Application: ${job.title}</h3>
                <p style="color: #4b5563;">Hello! I'm interested in the <strong>${job.title}</strong> role at <strong>${job.company}</strong>.</p>
                
                <hr style="border: 0; border-top: 1px solid #d1d5db; margin: 15px 0;">

                <div style="display: flex; gap: 15px; align-items: start;">
                    <img src="${applicant.profilePicture || '/uploads/default-avatars/default.png'}" 
                         style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #3b82f6;">
                    
                    <div>
                        <h4 style="margin: 0; font-size: 18px; color: #111827;">${applicant.username}</h4>
                        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">
                            ${applicant.headline || applicant.work || 'No headline'}
                        </p>
                        <p style="margin: 0; font-size: 13px; color: #9ca3af;">📍 ${applicant.location || 'Location not set'}</p>
                    </div>
                </div>

                <div style="margin-top: 15px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                    <strong style="color: #374151; font-size: 14px; display: block; margin-bottom: 5px;">LATEST EXPERIENCE</strong>
                    ${latestExp ? `
                        <div style="font-size: 14px;">
                            <span style="color: #111827; font-weight: 600;">${latestExp.title}</span> at <span style="color: #2563eb;">${latestExp.company}</span>
                            <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">
                                ${new Date(latestExp.startDate).getFullYear()} - ${latestExp.current ? 'Present' : new Date(latestExp.endDate).getFullYear()}
                            </div>
                        </div>
                    ` : '<span style="color: #9ca3af; font-size: 14px;">No experience listed</span>'}
                </div>

                <div style="margin-top: 20px; text-align: center;">
                    <a href="${profileLink}" 
                       style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
                       View Full Profile
                    </a>
                </div>
            </div>
        `;

        const newMessage = new Message({
            conversationId: conversation._id,
            sequenceNumber: nextSequence,
            sender: req.user.id,
            receiver: recruiterId,
            text: htmlMessage 
        });

        await newMessage.save();

        job.applicants.push({ user: req.user.id, status: 'pending' });
        await job.save();

        res.json({ success: true, message: 'Application sent successfully!' });

    } catch (error) {
        console.error("Error applying:", error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

function formatTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    
    return "Just now";
}

module.exports = router;