const express = require('express');
const app = express();
const userRouter = require('./routers/userRouter');

app.use(express.json());

app.use('/api/user', userRouter);

app.use('/try', (req, res) => {
  res.json({
    message: 'Try done!',
  });
});

module.exports = app;
