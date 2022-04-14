const express = require('express');
const mysql = require('mysql');

const port = 3000;
const app = express();

app.use(express.json());

const conn = mysql.createConnection({
  host: '0.0.0.0',
  user: 'root',
  password: 'abc123',
  database: 'reddit',
});

const defaultScore = 0;

app.post('/posts', (req, res) => {
    const data = {
        title: req.body.title,
        url: req.body.url,
        owner: req.body.owner,
        timestamp: Date.now(),
    };

    // Validation
    if (!data.title) {
        res.status(400).send({ message: 'missing title' });
        return;
    }
    if (!data.url || !data.url.includes(':')) {
        res.status(400).send({ message: 'missing or invalid URL' });
        return;
    }
    if (!data.owner) {
        res.status(400).send({ message: 'missing owner' });
        return;
    }

    const query = `
        INSERT INTO posts (title, url, owner, timestamp)
        VALUES (?, ?, ?, ?)
    `;
    const params = [data.title, data.url, data.owner, data.timestamp];

    conn.query(query, params, (error, result) => {
        if (error) {
            res.status(500).send({ message: 'DB error' });
            return;
        }
        res.status(201).send({
            id: result.insertId,
            score: defaultScore,
            ...data
        });
    });
});

function vote(req, res, operator) {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).send({ message: 'invalid ID' });
        return;
    }

    const updateQuery = `
        UPDATE posts SET score = score ${operator} 1 WHERE id = ?
    `;
    const params = [id];

    conn.query(updateQuery, params, (updateErr, updateResult) => {
        if (updateErr) {
            res.status(500).send({ message: 'DB error' });
            return;
        }

        if (updateResult.affectedRows === 0) {
            // No row has been updated
            res.status(404).send({ message: 'not found' });
            return;
        }

        const selectQuery = `SELECT * FROM posts WHERE id = ?`;

        conn.query(selectQuery, params, (selectErr, rows) => {
            if (selectErr) {
                res.status(500).send({ message: 'DB error' });
                return;
            }

            if (rows.length === 0) {
                // Someone has deleted the post since the update
                res.status(410).send({ message: 'gone' });
                return;
            }

            res.send(rows[0]);
        });
    });
}

app.put('/posts/:id/upvote', (req, res) => vote(req, res, '+'));
app.put('/posts/:id/downvote', (req, res) => vote(req, res, '-'));

app.delete('/posts/:id', (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        res.status(400).send({ message: 'invalid ID' });
        return;
    }

    const username = req.headers.username;
    if (!username) {
        res.status(401, { message: 'Unauthorized' });
        return;
    }

    const selectQuery = `SELECT * FROM posts WHERE id = ?`;
    const params = [id];

    conn.query(selectQuery, params, (selectErr, rows) => {
        if (selectErr) {
            res.status(500).send({ message: 'DB error' });
            return;
        }

        if (rows.length === 0) {
            res.status(404, { message: 'Not found' });
            return;
        }

        const owner = rows[0].owner;

        if (username !== owner) {
            res.status(401, { message: 'Unauthorized' });
            return;
        }

        const deleteQuery = `DELETE * FROM posts WHERE id = ?`;
        conn.query(deleteQuery, params, (deleteErr) => {
            if (deleteErr) {
                res.status(500).send({ message: 'DB error' });
                return;
            }

            // The usual response for a DELETE request is
            // 204 No Content with empty response body
            res.status(204).send();
        });
    });
});

app.listen(port, () =>
    console.log(`Server running at http://localhost:${port}`)
);
