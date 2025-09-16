const express = require('express');
const { Event, Interview } = require('../database');
const router = express.Router();

router.post('/events', async (req, res) => {
    try {
        const { interviewId, timestamp, message } = req.body;
        const event = new Event({
            interviewId,
            timestamp: new Date(timestamp),
            message
        });
        await event.save();
        res.status(201).json({ message: 'Event logged successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/events/:interviewId', async (req, res) => {
    try {
        const events = await Event.find({ interviewId: req.params.interviewId })
            .sort({ timestamp: 1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/interviews', async (req, res) => {
    try {
        const { interviewId, candidateName, startTime, endTime, duration, focusEvents, objectEvents, integrityScore } = req.body;
        const interview = new Interview({
            interviewId,
            candidateName,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            duration,
            focusEvents,
            objectEvents,
            integrityScore
        });
        await interview.save();
        res.status(201).json({ message: 'Interview saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/interviews/:interviewId', async (req, res) => {
    try {
        const interview = await Interview.findOne({ interviewId: req.params.interviewId });
        if (!interview) {
            return res.status(404).json({ error: 'Interview not found' });
        }
        
        const events = await Event.find({ interviewId: req.params.interviewId })
            .sort({ timestamp: 1 });
        
        res.json({
            interview,
            events
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;