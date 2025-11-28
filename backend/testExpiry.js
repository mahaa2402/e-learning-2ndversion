const moment = require('moment-timezone');

// Simulate a deadline 10 minutes from now
const deadline = Date.now() + 10 * 60 * 1000;

// Show raw UTC values
console.log("Current UTC (ms):", Date.now(), "|", new Date(Date.now()).toISOString());
console.log("Deadline UTC (ms):", deadline, "|", new Date(deadline).toISOString());

// Convert to IST for display
console.log("Current time IST:", moment().tz('Asia/Kolkata').format('DD/MM/YYYY hh:mm A'));
console.log("Deadline time IST:", moment(deadline).tz('Asia/Kolkata').format('DD/MM/YYYY hh:mm A'));

// Optional: simulate token verification logic
const now = Date.now();
if (now > deadline) {
    console.log("❌ Token expired!");
} else {
    console.log("✅ Token valid. Time remaining (ms):", deadline - now);
}
