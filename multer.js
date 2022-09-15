const multer = require("multer");
const path = require("path");

const fileFilter = (req, file, cb) => {
  // 확장자 필터링
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true); // 해당 mimetype만 받겠다는 의미
  } else {
    // 다른 mimetype은 저장되지 않음
    req.fileValidationError = "jpg,jpeg,png 파일만 업로드 가능합니다.";
    cb(null, false);
  }
};
const upload = multer({
    storage: multer.diskStorage({	// 파일이 저장될 경로
      destination(req, file, cb) {
        cb(null, "assets/img/uploads/");
      },
      filename(req, file, cb) {
        const ext = path.extname(file.originalname);	// 파일 확장자
        //const timestamp = new Date().getTime().valueOf();	// 현재 시간
        // 새 파일명(기존파일명 + 시간 + 확장자)
        const filename = path.basename(req.body.id, ext)  + ext;
        cb(null, filename);
      },
    }),
    fileFilter : fileFilter,
    limits: { fileSize: 30 * 1024 * 1024 },
});
module.exports = { upload };

