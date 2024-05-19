import express from "express";
import pkg from "pg";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const { Pool } = pkg;
/* Postgres cluster tiktokbackendtest2 created
  Username:    postgres
  Password:    hT01v9ylRVMeU3m
  Hostname:    tiktokbackendtest2.internal
  Flycast:     fdaa:5:35ca:0:1::4a
  Proxy port:  5432
  Postgres port:  5433
  Connection string: postgres://postgres:hT01v9ylRVMeU3m@tiktokbackendtest2.flycast:5432*/
const pool = new Pool({
  user: "postgres",
  password: "hT01v9ylRVMeU3m",
  host: "tiktokbackendtest2",
  database: "postgres",
  port: 5432,
});

const app = express();
const corsOptions = {
  origin: "*",
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(fileUpload());
app.use(express.static("uploads"));

// __dirname 대체 코드
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// 문의 데이터 생성 API
const createQuestion = async (req, res) => {
  try {
    const { inquirer_name, phone, email, title, content } = req.body;
    let file_url = null;

    if (req.files && req.files.file) {
      const file = req.files.file;
      const filePath = path.join(UPLOAD_DIR, file.name);
      await file.mv(filePath);
      file_url = `/uploads/${file.name}`;
    }

    const query = `
      INSERT INTO questions (inquirer_name, phone, email, title, content, file_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [inquirer_name, phone, email, title, content, file_url];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(400).json({
        resultCode: "F-2",
        msg: "문의 작성 실패",
      });
    }

    res.json({
      resultCode: "S-1",
      msg: "문의 작성 성공",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error during question creation:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
      error: error.message,
    });
  }
};

app.post("/api/questions", createQuestion);

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
