// This is an example server
//my modifying Roman

const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

const pool = new Pool({
    host: "localhost",
    port: 5432,
    user: "szemate",
    password: "abc123",
    database: "cyf_hotels",
});

app.get("/users/:customerId", (req, res) => {
    const customerId = req.params.customerId;
    const query = `SELECT * FROM customers WHERE id = $1;`;

    pool.query(query, [customerId])
        .then((result) => res.send(result.rows[0]))
        .catch((error) => {
            console.error(error);
            res.status(500).send(error);
        });
});

app.put("/customers/:customerId", (req, res) => {
    const customerId = req.params.customerId;

    const newAddress = req.body.address;
    const newCity = req.body.city;
    const newPostcode = req.body.postcode;
    const newCountry = req.body.country;

    const selectQuery = `SELECT * FROM customers WHERE id = $1;`;
    const updateQuery = `
        UPDATE customers
        SET address = $2, city = $3, postcode = $4, country = $5
        WHERE id = $1
        RETURNING *;`;

    pool.query(selectQuery, [customerId])
        .then((selectResult) => {
            const origCustomer = selectResult.rows[0];
            return pool.query(updateQuery, [
                customerId,
                newAddress || origCustomer.address,
                newCity || origCustomer.city,
                newPostcode || origCustomer.postcode,
                newCountry || origCustomer.country,
            ]);
        })
        .then((updateResult) => res.send(updateResult.rows[0]))
        .catch((error) => {
            console.error(error);
            res.status(500).send(error);
        });
});

app.listen(3000);
