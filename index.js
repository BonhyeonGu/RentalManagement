
// 1. 모듈 불러오기
const express = require('express')
const expressSession = require("express-session");
const MemoryStore=require('memorystore')(expressSession); // FileStore -> MemoryStore로 바꿈.
const fs = require('fs')
const crypto = require('crypto');

// 2. DB 연동하기
const { upload } = require("./multer.js");
const db=require("./secret/database.js");
const { parse } = require('path');
const conn=db.init()
db.connect(conn)

// 3. session 저장소 설정하기
const app = express()
app.use(expressSession({
    //httpOnly: true, // 자바스크립트로 쿠키 조회 t/f
    //secure: true, // https 환경에서만 session 정보를 주고 받기 t/f
    secret: "W#@598c&r*952#3988W", // 쿠기 임의 변조 방지. 이 값을 토대로 세션 암호화
    resave: false, // 세션에 변경 사항이 없을 시 항상 저장 t/f
    saveUninitialized: true, // 세션이 최초 만들어지고 수정이 안된다면, 저장되기 전에 uninitialized 상태로 미리 만들어서 저장 t/f
    store: new MemoryStore({
        checkPeriod: 86400000, // 24 hours (= 24 * 60 * 60 * 1000 ms)
    }),
    cookie: {maxAge: 86400000}
}));

// 4. 정적 파일 설정하기
app.use(express.static('public'));
app.use(express.static('assets'));

// 5. view 엔진 설정하기
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

// 6. bodyParser 설정하기
app.use(express.urlencoded({ extended: true}));

// 7. 함수, 변수 정의하기
let user_uid;
function user_auth_2(user_auth,res){
    if (user_auth=='2') { // read, read&write(관리자)
        return 2
    }
    else return res.status(401).send('<h1>이 페이지에 접근할 권한이 없습니다😥</h1><hr><p>현재 페이지는 회원등급 \'0\'만 접근가능합니다</p><button onclick="location.href=`/`">메인으로 돌아가기</button>');
}
function user_auth_1_2(user_auth,res){
    if (user_auth=='2'||user_auth=='1') { // read, read&write(관리자)
        return 2
    }
    else return res.status(401).send('<h1>이 페이지에 접근할 권한이 없습니다😥</h1><hr><p>현재 페이지는 회원등급 \'0,1\'만 접근가능합니다</p><button onclick="location.href=`/`">메인으로 돌아가기</button>');
}
function user_auth_0_1_2(user_auth,res){
    if (user_auth=='2'||user_auth=='1'||user_auth=='0') { // read, read&write(관리자)/
        return 2
    }
    else return res.status(401).send('<h1>이 페이지에 접근할 권한이 없습니다😥</h1><hr><p>현재 페이지는 회원등급 \'0,1,2\'만 접근가능합니다</p><button onclick="location.href=`/`">메인으로 돌아가기</button>');
}
function myQueryErrorHandler(e) {
    console.log(e.name + " : " + e.message)
    var errM = e.message.split(':');
    if(errM[0] == 'ER_DATA_TOO_LONG') {
        return ['500','<script>alert("입력된 데이터가 너무 길어요! 양식에 맞춰 다시 입력해주세요.");history.back();</script>']
    }
    else {
        return ['500',`<h1>홈페이지 이용에 불편을 드려 죄송합니다.</h1>예기치 못한 오류가 발생했어요😥<hr>${e.name} : ${e.message}<p><button onclick="history.back()">뒤로가기</button>`]
    }
}
function myFsErrorHandler(e) {
    console.log(e.name + " : " + e.message)
    return ['500',`<h1>홈페이지 이용에 불편을 드려 죄송합니다.</h1>예기치 못한 오류가 발생했어요😥<hr>${e.name} : ${e.message}<p><button onclick="history.back()">뒤로가기</button>`]
}


// ================================= 메인 화면 관련 라우터 =======================================
// '/' GET 라우팅
app.get("/", (request, response)=>{
    conn.query('select id, name, image, remaining_qty from product', function(err, rows, fields) {
        if (err) {
            try {
                throw err;
            } catch(e) {
                var data = myQueryErrorHandler(e);
                response.status(Number(data[0])).send(data[1]);
            }
        }
        else {
            let arr = [];
            for (var i = 0; i < rows.length; i++) arr[i] = rows[i]['name'];
            let json1 = JSON.stringify(arr);
    
            response.render('main.ejs', {id:request.session.user_id, auth:request.session.user_auth, product_list:rows, searchData:json1});
        }
    });
})

// '/work_single' GET 라우팅
app.get("/work_single", (request, response)=>{
    var product_id = request.query.product_id

    conn.query(`select id, name, image,remaining_qty, total_qty from product where id='${product_id}'`, function(err, rows, fields) {
        if (err) {
            try {
                throw err;
            } catch(e) {
                var data = myQueryErrorHandler(e);
                response.status(Number(data[0])).send(data[1]);
            }
        }
        else response.render('work_single.ejs', {id:request.session.user_id, auth:request.session.user_auth, product_info:rows})
    })
})

// '/search' GET 라우팅
app.get("/search", (request, response)=>{ 
    conn.query(`select id, name, image, remaining_qty from product where name like '%${request.query.q}%'`, function(err, rows, fields){
        if (err) {
            try {
                throw err;
            } catch(e) {
                var data = myQueryErrorHandler(e);
                response.status(Number(data[0])).send(data[1]);
            }
        }
        else {
            conn.query('select id, name, image, remaining_qty from product', function(err, rows1, fields) {
                if (err) {
                    try {
                        throw err;
                    } catch(e) {
                        var data = myQueryErrorHandler(e);
                        response.status(Number(data[0])).send(data[1]);
                    }
                }
                else {
                    let arr = [];
                    for (var i = 0; i < rows1.length; i++) arr[i] = rows1[i]['name'];
                    let json1 = JSON.stringify(arr);
            
                    response.render('main.ejs', {id:request.session.user_id, auth:request.session.user_auth, product_list:rows, searchData:json1});
                }
            })
        }
    })
})

// ================================= 회원가입 관련 라우터 =======================================
// 확인완료
app.get("/signup", (request, response)=>{
    fs.readFile("public/signup.html", (error,data)=>{
        if (error) {
            try {
                throw err;
            } catch(e) {
                var data = myFsErrorHandler(e);
                response.status(Number(data[0])).send(data[1]);
            }
        }
        else {
            response.writeHead(200,{'Content-Type' : "text/html"})
            response.write(data)
            response.end()
        }
    })
})
// 확인완료
app.post("/signup", (request, response)=>{
    let newID = request.body.user_id
    let newPW = request.body.user_pw
    let chkPW = request.body.user_pw_chk
    if(request.body.user_id&&request.body.user_pw&&request.body.user_pw_chk&&request.body.user_school&&request.body.user_num&&request.body.user_name&&request.body.user_department&&request.body.user_attend_status&&request.body.user_grade&&request.body.user_phone){
        let sql = `SELECT * FROM rental_user WHERE user_id='${newID}'`
        conn.query(sql, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                if (rows.length != 0) {
                    response.send(`<script>alert("이미 존재하는 계정입니다."); history.back()</script>`)
                    response.end()
                }
                else {
                    let idReg =  /^(?=.*[a-zA-Z])[a-zA-Z\d-_]{5,20}/g // 아이디 정규식 검사
                    let pwReg = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z\d~!@#$%^&*]{8,16}$/g // 비밀번호 정규식 검사
    
                    if (newPW != chkPW) {
                        response.send(`<script>alert("비밀번호가 일치하지 않습니다. 다시 확인해 주세요."); history.back()</script>`)
                        response.end()
                    }
                    else {
                        if (idReg.test(newID) && pwReg.test(newPW)) { // 회원가입 신청 성공
                            let sha256_hex_pw=crypto.createHash('sha256').update(newPW).digest('hex')
                            conn.query(`insert into rental_user values(NULL,"${request.body.user_school}","${request.body.user_num}","${request.body.user_name}","${request.body.user_department}","${request.body.user_grade}","${request.body.user_id}","${sha256_hex_pw}","${request.body.user_attend_status}","${request.body.user_phone}",now(),NULL,"0","4")`, function(err){
                                if (err) {
                                    try {
                                        throw err;
                                    } catch(e) {
                                        var data = myQueryErrorHandler(e);
                                        response.status(Number(data[0])).send(data[1]);
                                    }
                                }
                                else response.send(`<script>alert('회원가입이 신청되었습니다. 방문일은 추후에 알려드리겠습니다.'); location.href = '/login'</script>`)
                            })
                        }
                        else if (!idReg.test(newID)){ // 아이디 조건 실패
                            response.send(`<script>alert("아이디가 조건에 부합하지 않습니다. 다시 입력해 주세요."); history.back()</script>`)
                            response.end()
                        }
                        else if (!pwReg.test(newPW)){ // 비밀번호 조건 실패
                            response.send(`<script>alert("비밀번호가 조건에 부합하지 않습니다. 다시 입력해 주세요.");history.back()</script>`)
                            response.end()
                        }
                        else{
                            response.send(`<script>alert("아이디와 비밀번호가 조건에 부합하지 않습니다. 다시 입력해 주세요."); history.back()</script>`)
                            response.end()
                        }            
                    }
                }
            }
        })
    }
    else{
        response.send(`<script>alert("모든 정보가 입력 되지 않았습니다. 다시 입력해 주세요."); history.back()</script>`)
        response.end()
    }
})

// ================================= 로그인 관련 라우터 =======================================
// '/logout' GET 라우팅
// 확인완료
app.get("/logout", (request, response)=>{
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        request.session.destroy(function(err){
            response.redirect('/');
        })
    }
})

// '/login' GET 라우팅
// 확인완료
app.get("/login", (request, response)=>{
    fs.readFile("public/login.html", (error,data)=>{
        if (error) {
            try {
                throw err;
            } catch(e) {
                var data = myFsErrorHandler(e);
                response.status(Number(data[0])).send(data[1]);
            }
        }
        else {
            response.writeHead(200,{'Content-Type' : "text/html"})
            response.write(data)
            response.end()
        }
    })
})

// 확인완료
app.post("/login",(request,response)=>{
    if(request.body.user_pw&&request.body.user_id){
        let id = request.body.user_id
        let pw = crypto.createHash('sha256').update(request.body.user_pw).digest('hex')
        conn.query(`select * from rental_user where user_id='${id}'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                if (rows.length == 0) flag = 0;
                else if (rows[0].user_pw != pw) flag = 1;
                else flag = 2;
                        
                if(flag==0){ // 아이디 없음
                    response.send(`<script>alert('ID를 잘못 입력했습니다'); history.back();</script>`)
                }
                else if(flag==1){ // 비밀번호 틀림
                    let user_status = Number(rows[0].user_status) + 1 // 비밀번호 오류 횟수
                    if ( user_status < 5) {
                        conn.query(`update rental_user set user_status='${user_status}' where user_id='${id}'`, function(err){
                            if(err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else response.send(`<script>alert('${id}님 PW가 ${user_status}회 틀렸습니다'); history.back();</script>`)
                        })
                    }
                    else { 
                        conn.query(`update rental_user set user_status='${user_status}', user_auth='3' where user_id='${id}'`, function(err){
                            if(err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else response.send(`<script>alert('${id}님 비밀번호 오류 횟수 ${user_status}회 초과로 로그인 불가능합니다'); history.back();</script>`)
                        })
                    }
                }
                else if(flag==2){ // 로그인 성공
                    if(rows[0]['user_auth'] == '0'||rows[0]['user_auth'] == '1'||rows[0]['user_auth'] == '2') { // user, read, read&write(관리자)
                        // 세션 정보 저장
                        conn.query(`update rental_user set user_status='0', user_login_date = now() where user_id='${id}'`, function(err){
                            if(err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else {
                                request.session.user_auth = rows[0]['user_auth'];
                                request.session.user_id = rows[0]['user_id'];
                                request.session.uid=rows[0]['uid']
                                request.session.save(function(){
                                    response.redirect('/')
                                })
                            }
                        })
                    
                    }
                    else if(rows[0]['user_auth'] == '3') { // 잠금 계정
                        response.send(`<script>alert('${id}님의 계정은 잠금 계정입니다. 관리자에게 문의해주세요'); history.back();</script>`)
                    }
                    else if(rows[0]['user_auth'] == '4') { // 승인 대기중인 계정
                        response.send(`<script>alert('${id}님 회원가입 승인 대기중입니다. 관리자에게 문의해주세요'); history.back();</script>`)
                    }
                }
            }
        })
    }
    else{
        response.send(`<script>alert('정보를 입력해주세요'); history.back();</script>`)
    }
})

// ================================= 비품 대여 신청 관련 라우터 =======================================
// '/rental' GET 라우팅
app.get("/rental", (request, response)=>{ 
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        conn.query(`select id, name, total_qty from product where id='${request.query.product_id}'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }

            else response.render('user_rental.ejs', {id:request.session.user_id, auth:request.session.user_auth, product_info:rows})
        })
    }
})

// '/rental_sign_result' POST 라우팅
app.post("/rental_sign_result", (request, response)=>{
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        conn.query(`insert into rental_manage values(NULL,${request.session.uid},${request.body.product_id},now(),"${request.body.product_start_date}",${request.body.product_using_period},NULL,${request.body.product_qty},"1",NULL)`, function(err){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.send(`<script>alert('물품 대여가 신청되었습니다. 결과는 추후에 알려드리겠습니다.'); location.href="/work_single?product_id=${request.body.product_id}"</script>`)
        })
    }
})

// ================================= 비품 대여 이력 관련 라우터 =======================================
// '/rental_status' GET 라우팅
app.get("/rental_status", (request, response)=>{
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        conn.query(`select * from product, rental_manage where product.id=rental_manage.pid and uid=${request.session.uid}`, function(err, rows, fields){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                let arr = [];
                for (var i = 0; i < rows.length; i++) arr[i] = rows[i]['name'];
                let json1 = JSON.stringify(arr);
    
                response.render('user_rental_status.ejs', {id:request.session.user_id, auth:request.session.user_auth, rows_list : rows, searchData:json1})
            }
        })
    }
})

// '/rental_status_search' GET 라우팅
app.get("/rental_status_search", (request, response)=>{
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        conn.query(`select * from product, rental_manage where product.id=rental_manage.pid and rental_manage.uid=${Number(request.session.uid)} and product.name like'%${request.query.q}%'`, function(err, rows, fields){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                conn.query(`select * from product, rental_manage where product.id=rental_manage.pid and uid=${request.session.uid}`, function(err, rows1, fields){
                    if(err) {
                        try {
                            throw err;
                        } catch(e) {
                            var data = myQueryErrorHandler(e);
                            response.status(Number(data[0])).send(data[1]);
                        }
                    }
                    else {
                        let arr = [];
                        for (var i = 0; i < rows1.length; i++) arr[i] = rows1[i]['name'];
                        let json1 = JSON.stringify(arr);
            
                        response.render('user_rental_status.ejs', {id:request.session.user_id, auth:request.session.user_auth, rows_list : rows, searchData:json1})
                    }
                })
            }
        })
    }
})

app.post("/rental_status_delete", (request, response)=>{
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        conn.query(`delete from rental_manage where ma_id='${request.body.ma_id}'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                response.write(`<script>alert("${request.session.user_id} : 물품 신청을 취소하였습니다."); location.href = '/rental_status' </script>`)
                response.end()
            }
        })
    }
})

// ================================= 비밀번호 변경 관련 라우터 =======================================
// 확인완료
app.get("/privacy_pw", (request, response)=>{
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        response.render('privacy_pw.ejs', {id:request.session.user_id, auth:request.session.user_auth});
    }
})

// 확인완료
app.post("/privacy_pw", (request, response)=>{ // 사용자(관리자) 비밀번호 변경
    if (user_auth_0_1_2(request.session.user_auth,response)==2) { // user, read, read&write(관리자)
        if(request.body.user_pw&&request.body.user_change_pw&&request.body.user_change_repw){
            let tmp2 = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z\d~!@#$%^&*]{8,16}$/g
            let pw = crypto.createHash('sha256').update(request.body.user_pw).digest('hex')
            conn.query(`select * from rental_user where user_id='${request.session.user_id}'`, function(err, rows, fields){
                if (err) {
                    try {
                        throw err;
                    } catch(e) {
                        var data = myQueryErrorHandler(e);
                        response.status(Number(data[0])).send(data[1]);
                    }
                }
                else {
                    if(pw==rows[0]['user_pw']){
                        if(request.body.user_change_pw==request.body.user_change_repw){
                            if(tmp2.test(request.body.user_change_pw)==true){
                                let change_pw = crypto.createHash('sha256').update(request.body.user_change_pw).digest('hex')
                                conn.query(`update rental_user set user_pw='${change_pw}' where user_id='${request.session.user_id}'`, function(err, rows, fields){
                                    if (err) {
                                        try {
                                            throw err;
                                        } catch(e) {
                                            var data = myQueryErrorHandler(e);
                                            response.status(Number(data[0])).send(data[1]);
                                        }
                                    }
                                    else {
                                        response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                                        response.write(`<script>alert("${request.session.user_id} : 비밀번호 변경 완료"); location.href = '/'</script>`)
                                        response.end()
                                    }
                                })
                            }
                            else{
                                response.send(`<script>alert('바꿀 비밀번호가 조건에 부합하지 않습니다.'); history.back()</script>`)
                            }
                        }
                        else{
                            response.send(`<script>alert('바꿀 비밀번호가 서로 다릅니다.'); history.back()</script>`)
                        }
                    }
                    else{
                        response.send(`<script>alert('현재 비밀번호가 틀렸습니다.'); history.back()</script>`)
                    }
                }
            })
        }
        else{
            response.send(`<script>alert('정보를 입력해주세요.'); history.back()'</script>`)
        }
    }
})

// ================================= 👀(관리자)비품 관리 관련 라우터👀 =======================================
// 확인완료
app.get("/database", (request, response)=>{
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        conn.query(`select * from product`, function(err, rows, fields){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_database.ejs', { id:request.session.user_id, auth:request.session.user_auth, rows_list:rows})
        })
    }
})

// 확인완료
app.post("/database_search", (request, response)=>{
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        conn.query(`select * from product where name like '%${request.body.id}%'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_database.ejs', {rows_list : rows})
        })
    }
})

// 확인완료
app.get("/database_add", (request, response)=>{ 
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`select * from product`, function(err, rows, fields){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_database_add.ejs', {rows_list : rows})
            
        })
    }
})

// 확인완료
app.post("/database_adding",upload.single('image'),(request, response)=>{ 
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        if(request.file==undefined) response.send(`<script>alert('사진을 입력해주세요'); history.back()</script>`)
        else{
            if(request.body.name&&parseInt(request.body.lendable)&&parseInt(request.body.status)&&parseInt(request.body.total_qty)&&parseInt(request.body.remaining_qty)&&(request.body.total_qty==request.body.remaining_qty)){
                conn.query(`insert into product values(NULL,"${request.body.name}","${request.body.tag}","${request.body.model_id}","${request.body.serial}","${request.body.note}","${request.file.filename}",now(),now(), ${request.body.lendable},${request.body.status},"${request.body.company}",${request.body.total_qty},${request.body.remaining_qty})`, function(err){
                    if (err) {
                        try {
                            throw err;
                        } catch(e) {
                            var data = myQueryErrorHandler(e);
                            response.status(Number(data[0])).send(data[1]);
                        }
                    }
                    else response.send(`<script>alert('데이터베이스에 추가되었습니다.'); location.href='/database'</script>`)
                })
            }
            else{
                response.send(`<script>alert('필수입력\\n물품명 : string \\n빌리기 상태, 물품상태, 총 갯수, 남은 갯수 : int\\n총 갯수==남은갯수 \\n양식 맞춰서 입력해주세요'); history.back()</script>`)
            }
        }
    }
})

// 확인완료
app.post("/database_manage", (request, response)=>{ 
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`select * from product where id=${request.body.id}`, function(err, rows, fields){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_database_manage.ejs', {rows_list : rows})
        })
    }
})

// 확인완료
app.post("/database_modify", (request, response)=>{
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        if(request.file==undefined) response.send(`<script>alert('사진을 입력해주세요'); history.back()</script>`)
        else{
            if(request.body.name&&parseInt(request.body.lendable)&&parseInt(request.body.status)&&parseInt(request.body.total_qty)&&parseInt(request.body.remaining_qty)){
                conn.query(`select created_at from product where id=${request.body.id}`, function(err, rows1, fields){
                    if (err) {
                        try {
                            throw err;
                        } catch(e) {
                            var data = myQueryErrorHandler(e);
                            response.status(Number(data[0])).send(data[1]);
                        }
                    }
                    else{
                        let time = rows1[0]['created_at']
                        conn.query(`update product set id=${request.body.id},name="${request.body.name}",tag="${request.body.tag}",updated_at=now(),model_id="${request.body.model_id}",serial="${request.body.serial}",note="${request.body.note}",image="${request.body.image}",created_at='${time}',lendable=${request.body.lendable},status=${request.body.status},company="${request.body.company}",total_qty=${request.body.total_qty},remaining_qty=${request.body.remaining_qty} where id=${request.body.id}`, function(err){
                            if(err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else response.send(`<script>alert('데이터베이스에 수정되었습니다.'); location.href='/database'</script>`)
                        })
                    }
                })
            }
            else{
                response.send(`<script>alert('필수입력\\n물품명 : string \\n빌리기 상태, 물품상태, 총 갯수, 남은 갯수 : int\\n양식 맞춰서 입력해주세요'); history.back()</script>`)
            }
        }
    }
})

// 확인완료
app.post("/database_deny", (request, response)=>{ 
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`delete from product where id=${request.body.id}`, function(err){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.send(`<script>alert('데이터베이스에서 삭제되었습니다.'); location.href='/database'</script>`)
        })
    }
})

// ================================= 👀(관리자)비품 대여 관리 관련 라우터👀 =======================================
app.get("/admin_rentalmanage", (request, response)=>{ // 전체 검색
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        let qry1 = "SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN product a ON m.pid = a.id \
            WHERE m.ma_state = '1'"
    
        conn.query(qry1, function(err, reserv, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                let qry2 = "SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN product a ON m.pid = a.id \
                WHERE m.ma_state = '2'"
                conn.query(qry2, function(err, using, fields){
                    if (err) {
                        try {
                            throw err;
                        } catch(e) {
                            var data = myQueryErrorHandler(e);
                            response.status(Number(data[0])).send(data[1]);
                        }
                    }
                    else {
                        let qry3 = "SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                        FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN product a ON m.pid = a.id \
                        WHERE m.ma_state = '3'"
                        conn.query(qry3, function(err, ret, fields){
                            if (err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
            
                            else response.render('admin_rentalmanage.ejs', {reserv_list : reserv, using_list : using, return_list : ret})
                        })
                    }
                })
            }
        })
    }
})

app.post("/admin_rentalmanage_search", (req, res)=>{ // 일부 검색
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        let userID = req.body.user_id;
        if (userID == "") res.redirect('/admin_rentalmanage')
        else {
            let qry1 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN product a ON m.pid = a.id \
                WHERE m.ma_state = '1' AND u.user_id = ${userID}`

            conn.query(qry1, function(err, reserv, fields){
                if (err) {
                    try {
                        throw err;
                    } catch(e) {
                        var data = myQueryErrorHandler(e);
                        response.status(Number(data[0])).send(data[1]);
                    }
                }
                else {
                    let qry2 = `SELECT m.ma_id, u.user_id, u.user_status, u.ucdser_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                    FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN product a ON m.pid = a.id \
                    WHERE m.ma_state = '2' AND u.user_id = ${userID}`
                    conn.query(qry2, function(err, using, fields){
                        if (err) {
                            try {
                                throw err;
                            } catch(e) {
                                var data = myQueryErrorHandler(e);
                                response.status(Number(data[0])).send(data[1]);
                            }
                        }
                        else {
                            let qry3 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN product a ON m.pid = a.id \
                            WHERE m.ma_state = '3' AND u.user_id = ${userID}`
                            conn.query(qry3, function(err, ret, fields){
                                if (err) {
                                    try {
                                        throw err;
                                    } catch(e) {
                                        var data = myQueryErrorHandler(e);
                                        response.status(Number(data[0])).send(data[1]);
                                    }
                                }
        
                                else res.render('admin_rentalmanage.ejs', {reserv_list : reserv, using_list : using, return_list : ret})
                            })
                        }
                    })
                }
            })
        }
    }
})

app.post("/admin_rentalmanage_resrv_recept", (request, response)=>{ // 예약 신청 수락
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        let maID = request.body.resrv_recept_ma_id;
        //let qry = `UPDATE rental_manage SET ma_state='2', ma_start_date=now(),ma_return_date=date_add(now(),INTERVAL ${rows1[0]['ma_using_period']} DAY) WHERE ma_id='${maID}'`
        //let qry2= `UPDATE product SET remaining_qty=remaining_qty-${rows1[0]['ma_qty']} where id=${request.body.resrv_recept_pid}`
        conn.query(`select * from rental_manage ,product where rental_manage.pid=product.id and product.id=${request.body.resrv_recept_pid}`, function(err, rows1, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                if(rows1[0]['remaining_qty']>=rows1[0]['ma_qty']){
                    if(rows1[0]['lendable']==1){
                        conn.query(`UPDATE rental_manage SET ma_state='2', ma_start_date=now(),ma_return_date=date_add(now(),INTERVAL ${rows1[0]['ma_using_period']} DAY) WHERE ma_id='${maID}'`, function(err, row2, fields){
                            if (err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else {
                                conn.query(`UPDATE product SET remaining_qty=remaining_qty-${rows1[0]['ma_qty']} where id=${request.body.resrv_recept_pid}`, function(err, rows3, fields){
                                    if (err) {
                                        try {
                                            throw err;
                                        } catch(e) {
                                            var data = myQueryErrorHandler(e);
                                            response.status(Number(data[0])).send(data[1]);
                                        }
                                    }
                                    else {
                                        response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                                        response.write(`<script>alert("${maID} : 예약 신청을 수락했습니다."); location.href = '/admin_rentalmanage'</script>`)
                                        response.end()
                                    }
                                })
                            }
                        })
                    }
                    else{
                        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                        res.write(`<script>alert("${maID} : 빌리기 불가능으로 수락이 불가능합니다."); location.href = '/admin_rentalmanage'</script>`)
                        res.end()
                    }
                }
                else{
                    res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                    res.write(`<script>alert("${maID} : 개수 초과로 수락이 불가능합니다."); location.href = '/admin_rentalmanage'</script>`)
                    res.end()
                }
            }
        })
    }
})

app.post("/admin_rentalmanage_resrv_reject", (req, res)=>{ // 예약 신청 거절
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)

        let maID = req.body.resrv_reject_ma_id;
        let qry = `DELETE FROM rental_manage WHERE ma_id=${maID}`
        conn.query(qry, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                res.write(`<script>alert("${maID} : 예약 신청을 거절했습니다."); location.href = '/admin_rentalmanage'</script>`)
                res.end()
            }
        })
    }
})

app.post("/admin_rentalmanage_return", (request, response)=>{ // 비품 반납
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)

        let maID = request.body.return_ma_id;
        //let qry = `UPDATE rental_manage SET ma_state='3',ma_return_date=now() WHERE ma_id='${maID}'`
        //let qry2= `UPDATE product SET remaining_qty=remaining_qty+${rows1[0]['ma_qty']} where id=${request.body.return_pid}`
        
        conn.query(`select * from rental_manage ,product where rental_manage.pid=product.id and product.id=${request.body.return_pid}`, function(err, rows1, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                conn.query(`UPDATE rental_manage SET ma_state='3',ma_return_date=now() WHERE ma_id='${maID}'`, function(err, rows2, fields){
                    if (err) {
                        try {
                            throw err;
                        } catch(e) {
                            var data = myQueryErrorHandler(e);
                            response.status(Number(data[0])).send(data[1]);
                        }
                    }
                    else {
                        conn.query(`UPDATE product SET remaining_qty=remaining_qty+${rows1[0]['ma_qty']} where id=${request.body.return_pid}`, function(err, rows3, fields){
                            if (err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else {
                                response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                                response.write(`<script>alert("${maID} : 반납으로 변경했습니다."); location.href = '/admin_rentalmanage'</script>`)
                                response.end()
                            }
                        })
                    }
                })
            }
        })
    }
})

app.post("/admin_rentalmanage_return_cancel", (request, response)=>{ // 비품 반납 취소(반납 -> 사용 중)
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        let maID = request.body.return_cancel_ma_id;
        //let qry = `UPDATE rental_manage SET ma_state='2' ,ma_return_date=date_add(${rows1[0]['ma_start_date']},INTERVAL ${rows1[0]['ma_using_period']} DAY) WHERE ma_id='${maID}'`
        //let qry2= `UPDATE product SET remaining_qty=remaining_qty-${rows1[0]['ma_qty']} where id=${request.body.return_cancel_pid} `

        conn.query(`select * from rental_manage ,product where rental_manage.pid=product.id and product.id=${request.body.return_cancel_pid}`, function(err, rows1, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                conn.query(`UPDATE rental_manage SET ma_state='2' ,ma_return_date=date_add("${rows1[0]['ma_start_date']}",INTERVAL ${rows1[0]['ma_using_period']} DAY) WHERE ma_id='${maID}'`, function(err, rows2, fields){
                    if (err) {
                        try {
                            throw err;
                        } catch(e) {
                            var data = myQueryErrorHandler(e);
                            response.status(Number(data[0])).send(data[1]);
                        }
                    }
                    else {
                        conn.query(`UPDATE product SET remaining_qty=remaining_qty-${rows1[0]['ma_qty']} where id=${request.body.return_cancel_pid} `, function(err, rows3, fields){
                            if (err) {
                                try {
                                    throw err;
                                } catch(e) {
                                    var data = myQueryErrorHandler(e);
                                    response.status(Number(data[0])).send(data[1]);
                                }
                            }
                            else {
                                response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                                response.write(`<script>alert("${maID} : 반납에서 사용중으로 변경했습니다."); </script>`)
                                response.end(`<script>location.href = '/admin_rentalmanage'</script>`)
                            }
                        })
                    }
                })
            }
        })
    }
})

// 확인완료
// ================================= 👀(관리자)회원가입 관련 라우터👀 =======================================
app.get("/admin_signup", (request, response)=>{ // 전체 검색(회원가입 대기 목록 검색)
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        conn.query(`select * from rental_user where user_auth='4'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_signup.ejs', {rows_list : rows})
        })
    }
})
// 확인완료
app.post("/admin_signup_search", (request, response)=>{ // 일부 검색(회원가입 대기 목록 검색)
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        let userID = request.body.user_id;
        conn.query(`select * from rental_user where user_auth='4' and user_id like "%${userID}%"`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_signup.ejs', {rows_list : rows})
        })
    }
})
// 확인완료
app.post("/admin_signup_recept", (request, response)=>{ // 회원가입 신청 수락(-> 회원으로 등록)
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`update rental_user set user_school="${request.body.user_school}" , user_num="${request.body.user_num}",user_name="${request.body.user_name}",user_department="${request.body.user_department}",user_grade=${request.body.user_grade},user_attend_status=${request.body.user_attend_status},user_phone="${request.body.user_phone}",user_auth='0' , user_join_date=curdate() where uid='${request.body.uid}'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                response.write(`<script>alert("${request.body.user_id} : 회원가입 신청을 수락했습니다."); location.href = '/admin_signup'</script>`)
                response.end()
            }
        })
    }
})
// 확인완료
app.post("/admin_signup_resrv_reject", (request, response)=>{ // 회원가입 신청 거절(-> DB에서 삭제)
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`delete from rental_user where uid='${request.body.uid}'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else {
                response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                response.write(`<script>alert("${request.body.user_id} : 회원가입 신청을 거절했습니다."); location.href = '/admin_signup' </script>`)
                response.end()
            }
        })
    }
})
// 확인완료
app.post("/admin_signup_manage", (request, response)=>{ // 회원가입 신청 폼 수정(회원으로 등록 전 DB에서 사용자 정보 확인&수정)
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`select * from rental_user where user_id='${request.body.signup_user_id}'`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_signup_rewirte.ejs', {rows_list : rows})
        })
    }
})

// ================================= 👀(관리자)회원 관리 관련 라우터👀 =======================================
//확인완료
app.get("/admin_userstatus", (request, response)=>{ // 전체 유저 현황
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`select * from rental_user where user_auth=0 or user_auth=1 or user_auth=2`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_userstatus.ejs', {rows_list : rows})
        })
    }
})

//확인완료
app.post("/admin_userstatus_search", (request, response)=>{
    if (user_auth_1_2(request.session.user_auth,response)==2) { // read, read&write(관리자)
        conn.query(`select * from rental_user where user_id='${request.body.user_id}' and (user_auth=0 or user_auth=1 or user_auth=2)`, function(err, rows, fields){
            if (err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_userstatus.ejs', {rows_list : rows})
        })
    }
})

//확인완료
app.post("/admin_userstatus_manage", (request, response)=>{ 
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`select * from rental_user where uid=${request.body.uid}`, function(err, rows, fields){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.render('admin_userstatus_manage.ejs', {rows_list : rows})
        })
    }
})

//확인완료
app.post("/admin_changeauth", (request, response)=>{ // 권한 수정
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        conn.query(`update rental_user set user_auth="${request.body.user_change_auth}" where uid="${request.body.uid}"`, function(err){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.send(`<script>alert('권한이 변경되었습니다.'); location.href = '/admin_userstatus'</script>`)
        })
    }
})

//확인완료
app.post("/admin_changepw", (request, response)=>{ // 비밀번호 수정(비밀번호를 잃어버렸을 경우)
    if (user_auth_2(request.session.user_auth,response)==2) { // read&write(관리자)
        let sha256_hex_pw=crypto.createHash('sha256').update("qwer!1234").digest('hex')
        conn.query(`update rental_user set user_pw="${sha256_hex_pw}" where uid="${request.body.uid}"`, function(err){
            if(err) {
                try {
                    throw err;
                } catch(e) {
                    var data = myQueryErrorHandler(e);
                    response.status(Number(data[0])).send(data[1]);
                }
            }
            else response.send(`<script>alert('비밀번호가 qwer!1234로 초기화되었습니다.'); location.href = '/admin_userstatus'</script>`)
        })
    }
})

// ================================= 오류 관련 라우터 =======================================
// 확인완료
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!')
})
// 확인완료
app.use(function(req, res, next) {
    res.status(404).send('Sorry cant find that!');
})

// ================================= listen =======================================
// 확인완료
app.listen(9999, ()=>{
    console.log('server start')
})