const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Conversation = require('../models/conversation');
const Message = require('../models/Message'); 

router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.render('login');

    const rawConversations = await Conversation.find({ users: req.user.id })
      .populate('users', 'username profilePicture')
      .sort({ updatedAt: -1 })
      .lean();

    const conversations = rawConversations.map(conv => {
       const otherUser = (conv.users || []).find(u => u._id.toString() !== req.user.id);
       return {
         ...conv,
         user: otherUser || { username: 'Unknown', profilePicture: '' }
       };
    });

    res.render('messages', {
      user,
      conversations
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.get('/conversation', auth, async (req, res) => {
   try {
       const rawConversations = await Conversation.find({ users: req.user.id })
           .populate('users', 'username profilePicture')
           .sort({ updatedAt: -1 })
           .lean();

       const conversations = await Promise.all(rawConversations.map(async (conv) => {
            const otherUser = (conv.users || []).find(u => u._id.toString() !== req.user.id);
            
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                receiver: req.user.id,
                read: false
            });

            return {
                  ...conv,
                  user: otherUser,
                  hasUnreadMessages: unreadCount > 0,
                  unreadCount: unreadCount
            };
       }));

       res.status(200).json({ success: true, conversations });
   } catch (err) {
       console.error(err);
       res.sendStatus(500);
   }
});

router.post('/conversation/create', auth, async (req, res) => {
    try {
        const { recipientId } = req.body;
        const senderId = req.user.id;

        if (senderId === recipientId) {
            return res.status(400).json({ message: "You cannot message yourself" });
        }

        let conversation = await Conversation.findOne({
            users: { $all: [senderId, recipientId], $size: 2 }
        });

        if (!conversation) {
            conversation = new Conversation({
                users: [senderId, recipientId],
            });
            await conversation.save();
        }

        res.status(200).json({ success: true, conversationId: conversation._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/send', auth, async (req, res) => {
    try {
        const { conversationId, content, receiver } = req.body; 
        const senderId = req.user.id; 

        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "Content required" });
        }
        if (!receiver) {
            return res.status(400).json({ message: "Receiver required" });
        }

        const newMessage = new Message({
            conversationId: conversationId,
            sender: senderId,
            receiver: receiver, 
            text: content.trim(), 
            sequenceNumber: Date.now()
        });

        await newMessage.save();

        await Conversation.findByIdAndUpdate(conversationId, { 
            updatedAt: Date.now() 
        });

        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username profilePicture')
            .lean();

        res.status(200).json({ success: true, message: populatedMessage });
    } catch (err) {
        console.error("Backend Send Error:", err);
        res.status(500).json({ message: "Failed to send message", error: err.message });
    }
});

router.get('/message/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId)
      .populate('users', 'username profilePicture')
      .lean();

    if (
      !conversation ||
      !conversation.users.some(u => u._id.toString() === req.user.id)
    ) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await Message.updateMany(
        { 
            conversationId: conversationId, 
        },
        { $set: { read: true } }
    );

    const otherUser = conversation.users.find(
      u => u._id.toString() !== req.user.id
    );

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username profilePicture')
      .sort({ sequenceNumber: 1 }) 
      .lean();

    res.status(200).json({
      success: true,
      conversation: {
        _id: conversation._id,
        user: otherUser,
        lastSequenceNumber: conversation.lastSequenceNumber
      },
      messages
    });
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;
