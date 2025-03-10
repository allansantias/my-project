require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

/* ========= 1. M-PESA API INTEGRATION ========= */

// Function to get M-Pesa access token
async function getMpesaToken() {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString("base64");

    try {
        const response = await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting M-Pesa token:", error);
        throw new Error("Failed to get M-Pesa access token");
    }
}

// Endpoint to initiate STK Push
app.post("/mpesa-payment", async (req, res) => {
    const { phone, amount } = req.body;
    const token = await getMpesaToken();
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, "");
    const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString("base64");

    const stkRequest = {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: "https://yourdomain.com/callback",
        AccountReference: "Booking",
        TransactionDesc: "Booking Payment",
    };

    try {
        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            stkRequest,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        res.json(response.data);
    } catch (error) {
        console.error("M-Pesa Payment Error:", error);
        res.status(500).json({ error: "M-Pesa payment failed" });
    }
});

/* ========= 2. PAYPAL API INTEGRATION ========= */

// Function to get PayPal access token
async function getPaypalToken() {
    const url = "https://api-m.sandbox.paypal.com/v1/oauth2/token";
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");

    try {
        const response = await axios.post(url, "grant_type=client_credentials", {
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting PayPal token:", error);
        throw new Error("Failed to get PayPal access token");
    }
}

// Endpoint to create PayPal order
app.post("/paypal-order", async (req, res) => {
    const { amount } = req.body;
    const token = await getPaypalToken();

    const orderDetails = {
        intent: "CAPTURE",
        purchase_units: [{ amount: { currency_code: "USD", value: amount } }],
    };

    try {
        const response = await axios.post(
            "https://api-m.sandbox.paypal.com/v2/checkout/orders",
            orderDetails,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        res.json(response.data);
    } catch (error) {
        console.error("PayPal Order Error:", error);
        res.status(500).json({ error: "Failed to create PayPal order" });
    }
});

// Endpoint to capture PayPal payment
app.post("/paypal-capture", async (req, res) => {
    const { orderId } = req.body;
    const token = await getPaypalToken();

    try {
        const response = await axios.post(
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`,
            {},
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        res.json(response.data);
    } catch (error) {
        console.error("PayPal Capture Error:", error);
        res.status(500).json({ error: "Failed to capture PayPal payment" });
    }
});

/* ========= START SERVER ========= */
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
