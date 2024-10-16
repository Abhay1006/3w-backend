require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const DATABASE_URL=process.env.DATABASE_URL;

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

mongoose.connect(DATABASE_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'));

const userSchema = new mongoose.Schema({
  name: String,
  totalPoints: { type: Number, default: 0 },
});

const User = mongoose.model('User', userSchema);

const historySchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  pointsAwarded: Number,
  claimTimestamp: { type: Date, default: Date.now }
});

const History = mongoose.model('History', historySchema);

app.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post('/users', async (req, res) => {
  const { name } = req.body;
  const newUser = new User({ name });
  await newUser.save();
  res.json(newUser);
});

app.post('/claim-points/:userId', async (req, res) => {
  const { userId } = req.params;
  const randomPoints = Math.floor(Math.random() * 10) + 1;
  
  const user = await User.findById(userId);
  if (user) {
    user.totalPoints += randomPoints;
    await user.save();

    const history = new History({ userId, pointsAwarded: randomPoints });
    await history.save();

    const users = await User.find().sort({ totalPoints: -1 });
    io.emit('leaderboard-update', users);

    res.json({ message: `${randomPoints} points awarded to ${user.name}` });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
});

app.get('/leaderboard', async (req, res) => {
  const users = await User.find().sort({ totalPoints: -1 });
  res.json(users);
});

app.get('/history', async (req, res) => {
  const history = await History.find().sort({ claimTimestamp: -1 });
  res.json(history);
});

server.listen(5000, () => {
  console.log('Server running on port 5000');
});
