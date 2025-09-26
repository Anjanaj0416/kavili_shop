import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cors from "cors";
import productRouter from './routes/productRouter.js';
import userRouter from './routes/userRouter.js';
import orderRouter from './routes/orderRouter.js';
dotenv.config()

console.log('Environment variables check:');
console.log('SECRET:', process.env.SECRET ? 'Available' : 'Missing');
console.log('MONGO_DB_URI:', process.env.MONGO_DB_URI ? 'Available' : 'Missing');
console.log('All env vars:', Object.keys(process.env).filter(key => !key.startsWith('npm_')));

const app = express();

const mongoUrl = process.env.MONGO_DB_URI

app.use(cors())

mongoose.connect(mongoUrl,{})

const connection = mongoose.connection;

connection.once("open",()=>{
  console.log("Database connected");
})

app.use(bodyParser.json())

app.use(

  (req,res,next)=>{

    const token = req.header("Authorization")?.replace("Bearer ","")
    console.log(token)

    if(token != null){
      jwt.verify(token, process.env.SECRET , (error,decoded)=>{

        if(!error){
          req.user = decoded        
        }

      })
    }

    next()

  }

)

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Request body:', JSON.stringify(req.body, null, 2));
    }
    next();
});


app.use("/api/products", productRouter);
app.use("/api/users", userRouter);
app.use ("/api/orders", orderRouter)

app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
});


app.listen(
  3000,
  ()=>{
    console.log(`Server is running on port 3000`);
  }
)

