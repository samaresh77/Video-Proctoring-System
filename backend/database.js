const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    interviewId: String,
    timestamp: Date,
    message: String,
    type: String 
});

const interviewSchema = new mongoose.Schema({
    interviewId: String,
    candidateName: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    focusEvents: Number,
    objectEvents: Number,
    integrityScore: Number
});

const Event = mongoose.model('Event', eventSchema);
const Interview = mongoose.model('Interview', interviewSchema);

module.exports = { Event, Interview };
