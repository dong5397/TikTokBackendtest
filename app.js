import express from "express";
import pkg from "pg";
import cors from "cors";
import multer from "multer";

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const { Pool } = pkg;
/* 
Postgres cluster tiktokar created
  Username:    postgres
  Password:    9DQnxnh37LBOCnE
  Hostname:    tiktokar.internal
  Flycast:     fdaa:5:35c8:0:1::21
  Proxy port:  5432
  Postgres port:  5433
  Connection string: postgres://postgres:9DQnxnh37LBOCnE@tiktokar.flycast:5432

Save your credentials in a secure place -- you won't be able to see them again!

*/
// PostgreSQL Connection Pool 설정
const pool = new Pool({
  user: "postgres",
  password: "9DQnxnh37LBOCnE",
  host: "tiktokar.internal",
  database: "postgres",
  port: 5432,
});

const app = express();

// CORS 설정
app.use(
  cors({
    origin: "*", // 모든 도메인에서의 요청을 허용
    methods: ["POST", "GET"],
    credentials: true,
  })
);

// JSON 파싱 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// __dirname 대체 코드
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, "uploads");
console.log("Upload directory path:", UPLOAD_DIR);

// uploads 디렉토리가 없으면 생성
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
  console.log("Created uploads directory at:", UPLOAD_DIR);
}

// 정적 파일 제공 경로 설정
app.use("/uploads", express.static(UPLOAD_DIR));

// Multer 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// 문의 데이터 생성 API
const createQuestion = async (req, res) => {
  try {
    const { inquirer_name, phone, email, title, content } = req.body;
    let file_url = null;

    if (req.file) {
      file_url = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
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

// 문의 데이터 조회 API
const getQuestions = async (req, res) => {
  try {
    const query = `
      SELECT * FROM questions
    `;
    const { rows } = await pool.query(query);

    const data = rows.map((question) => ({
      ...question,
      file_url: question.file_url
        ? `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(
            question.file_url.split("/uploads/")[1]
          )}`
        : null,
    }));

    res.json({
      resultCode: "S-1",
      msg: "문의 조회 성공",
      data,
    });
  } catch (error) {
    console.error("Error during questions retrieval:", error);
    res.status(500).json({
      resultCode: "F-1",
      msg: "에러 발생",
      error: error.message,
    });
  }
};

// 파일 목록 조회 API
app.get("/api/files", (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      console.error("Error reading uploads directory:", err);
      return res.status(500).json({
        resultCode: "F-1",
        msg: "파일 목록 조회 에러",
        error: err.message,
      });
    }

    const fileInfos = files.map((file) => ({
      name: file,
      url: `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(
        file
      )}`,
    }));

    console.log("Files in uploads directory:", fileInfos);

    res.json({
      resultCode: "S-1",
      msg: "파일 목록 조회 성공",
      data: fileInfos,
    });
  });
});

// POST 요청 경로
app.post("/api/questions", upload.single("file"), createQuestion);

// GET 요청 경로
app.get("/api/questions", getQuestions);

app.get("/", (req, res) => {
  res.send("Hello tiktok World!");
});

// 서버 시작
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Current working directory:", process.cwd());
  console.log("Upload directory path:", UPLOAD_DIR);
});
