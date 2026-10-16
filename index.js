require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/dbConnection");
const errorHandler = require("./middleware/errorHandler");

const app = express();
connectDB();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "E-commerce API running" }));

// Uncomment each line as you build that module
// app.use("/api/auth", require("./routes/authenticationRoutes"));
// app.use("/api/users", require("./routes/userProfileRoutes"));
// app.use("/api/products", require("./routes/productRoutes"));
// app.use("/api/orders", require("./routes/orderRoutes"));
// app.use("/api/analytics", require("./routes/analyticsRoutes"));

app.use(errorHandler); // must be last

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));