// admin_signup.html 왜 있지?
// admin_main.html 삭제. main.ejs에 통합
// admin_main 라우터 삭제
// 세션 저장장소 FileStore -> MemoryStore


const express = require('express')
const expressSession = require("express-session");
const MemoryStore=require('memorystore')(expressSession); // FileStore -> MemoryStore로 바꿈.
const fs = require('fs')
const app = express()
const bodyParser=require('body-parser')
const crypto = require('crypto');
app.set('view engine', 'ejs')
app.set('views', __dirname + '/../views')
const db=require(__dirname+"/database.js")
const conn=db.init()
db.connect(conn)

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

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true}));

let user_uid;


// -- 메인 화면 관련 라우터
app.get("/", (request, response)=>{
    response.render('main.ejs', {login_user_id : request.session.user_id, login_user_auth : request.session.user_auth});
})

// -- 로그인 관련 라우터
app.get("/login", (request, response)=>{
    fs.readFile("public/login.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
}) 
app.get("/logout", (request, response)=>{
    request.session.destroy(function(err){
        response.redirect('/');
    })
})
app.post("/login",(request,response)=>{
    let id = request.body.user_id
    let pw = crypto.createHash('sha256').update(request.body.user_pw).digest('hex')
    conn.query(`select * from rental_user where user_id='${id}'`, function(err, rows, fields){
        if (err) throw err;

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
                    if(err) throw err;
                    response.send(`<script>alert('${id}님 PW가 ${user_status}회 틀렸습니다'); history.back();</script>`)
                })
            }
            else { 
                conn.query(`update rental_user set user_status='${user_status}', user_auth='3' where user_id='${id}'`, function(err){
                    if(err) throw err;
                    response.send(`<script>alert('${id}님 비밀번호 오류 횟수 ${user_status}회 초과로 로그인 불가능합니다'); history.back();</script>`)
                })
            }
        }
        else if(flag==2){ // 로그인 성공
            if(rows[0]['user_auth'] == '0'||rows[0]['user_auth'] == '1'||rows[0]['user_auth'] == '2') { // 일반 사용자, read, read&write(관리자)
                // 세션 정보 저장
                conn.query(`update rental_user set user_login_date = now() where user_id='${id}'`, function(err){
                    if(err) throw err;
                    request.session.user_auth = rows[0]['user_auth'];
                    request.session.user_id = rows[0]['user_id'];
    
                    request.session.save(function(){
                        response.redirect('/')
                    })
                })
               
            }
            else if(rows[0]['user_auth'] == '3') { // 잠금 계정
                response.send(`<script>alert('${id}님의 계정은 잠금 계정입니다. 관리자에게 문의해주세요'); history.back();</script>`)
            }
            else if(rows[0]['user_auth'] == '4') { // 승인 대기중인 계정
                response.send(`<script>alert('${id}님 회원가입 승인 대기중입니다. 관리자에게 문의해주세요'); history.back();</script>`)
            }
        }
    })
})

app.get("/rental", (request, response)=>{
    conn.query(`select * from assets_qty`, function(err, rows, fields){
        if(err) throw err;
        response.render('../views/user_rental.ejs', {rows_list : rows})
    })

})

// -- 회원가입(사용자측) 관련 라우터
app.get("/signup", (request, response)=>{
    fs.readFile("public/signup.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.post("/signup", (request, response)=>{
    let newID = request.body.user_id
    let newPW = request.body.user_pw
    let chkPW = request.body.user_pw_chk

    let sql = `SELECT * FROM rental_user WHERE user_id='${newID}'`
    conn.query(sql, function(err, rows, fields){
        if (err) throw err;

        if (rows.length != 0) {
            response.write('<script>alert("이미 존재하는 계정입니다.")</script>')
            response.end('<script>history.back()</script>')
        }
        else {
            let idReg =  /^(?=.*[a-zA-Z])[a-zA-Z\d-_]{5,20}/g // 아이디 정규식 검사
            let pwReg = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z\d~!@#$%^&*]{8,16}$/g // 비밀번호 정규식 검사

            if (newPW != chkPW) {
                response.write('<script>alert("비밀번호가 일치하지 않습니다. 다시 확인해 주세요.")</script>')
                response.end('<script>history.back()</script>')
            }
            else {
                if (idReg.test(newID) && pwReg.test(newPW)) { // 회원가입 신청 성공
                    let sha256_hex_pw=crypto.createHash('sha256').update(newPW).digest('hex')
                    conn.query(`insert into rental_user values(NULL,"${request.body.user_school}","${request.body.user_num}","${request.body.user_name}","${request.body.user_department}","${request.body.user_grade}","${request.body.user_id}","${sha256_hex_pw}","${request.body.user_attend_status}","${request.body.user_phone}",now(),NULL,"0","4")`, function(err){
                        if (err) throw err;
                        response.send(`<script>alert('회원가입이 신청되었습니다. 방문일은 추후에 알려드리겠습니다.'); location.href='/login'</script>`)
                    })
                }
                else if (!idReg.test(newID)){ // 아이디 조건 실패
                    response.write('<script>alert("아이디가 조건에 부합하지 않습니다. 다시 입력해 주세요.")</script>')
                    response.end('<script>history.back()</script>')
                }
                else if (!pwReg.test(newPW)){ // 비밀번호 조건 실패
                    response.write('<script>alert("비밀번호가 조건에 부합하지 않습니다. 다시 입력해 주세요.")</script>')
                    response.end('<script>history.back()</script>')
                }
                else{
                    response.write('<script>alert("아이디와 비밀번호가 조건에 부합하지 않습니다. 다시 입력해 주세요.")</script>')
                    response.end('<script>history.back()</script>')
                }            
            }
        }
    })
})
app.get("/privacy_pw", (request, response)=>{
    fs.readFile("public/privacy_pw.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})
app.post("/privacy_pw", (request, response)=>{ // 사용자(관리자) 비밀번호 변경
    let tmp2 = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z\d~!@#$%^&*]{8,16}$/g
    if (request.session.user_auth=='2'||request.session.user_auth=='1'||request.session.user_auth=='0') {
        conn.query(`select * from rental_user where user_id='${request.session.user_id}'`, function(err, rows, fields){
            if(request.body.user_pw==rows[0]['user_pw']){
                if(request.body.user_change_pw==request.body.user_change_repw){
                    if(tmp2.test(request.body.user_change_pw)==true){
                        conn.query(`update rental_user set user_pw='${request.body.user_change_pw}' where user_id='${request.session.user_id}'`, function(err, rows, fields){
                            if (err) throw err;
                            response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
                            response.write(`<script>alert("${request.session.user_id} : 비밀번호 변경 완료"); location.href = '/'</script>`)
                            response.end()
                        })
                    }
                    else{
                        response.send(`<script>alert('바꿀 비밀번호가 조건에 부합하지 않습니다.'); location.href='/privacy_pw'</script>`)
                    }
                }
                else{
                    response.send(`<script>alert('바꿀 비밀번호가 서로 다릅니다.'); location.href='/privacy_pw'</script>`)
                }
            }
            else{
                response.send(`<script>alert('현재 비밀번호가 틀렸습니다.'); location.href='/privacy_pw'</script>`)
            }
        })
    }
    else {
        response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
    }
})



// -- 회원가입(관리자측) 관리 관련 라우터
app.get("/admin_signup", (request, response)=>{ // 전체 검색(회원가입 대기 목록 검색)
    if (request.session.user_auth=='2'||request.session.user_auth=='1') { // read, read&write(관리자)
        conn.query(`select * from rental_user where user_auth='4'`, function(err, rows, fields){
            if (err) throw err;
            response.render('../views/admin_signup.ejs', {rows_list : rows})
        })
    }
    else response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
})

app.post("/admin_signup_search", (request, response)=>{ // 일부 검색(회원가입 대기 목록 검색)
    let userID = request.body.user_id;
    conn.query(`select * from rental_user where user_auth='4' and user_id = "${userID}"`, function(err, rows, fields){
        if (err) throw err;
        response.render('../views/admin_signup.ejs', {rows_list : rows})
    })
})

app.post("/admin_signup_recept", (request, response)=>{ // 회원가입 신청 수락(-> 회원으로 등록)
    if (request.session.user_auth=='2') { // read&write(관리자)
        conn.query(`update rental_user set user_auth='1' and user_join_date=now() where user_id='${request.body.user_id}'`, function(err, rows, fields){
            if (err) throw err;
            response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
            response.write(`<script>alert("${request.body.user_id} : 회원가입 신청을 수락했습니다."); location.href = '/admin_signup'</script>`)
            response.end()
        })
    }
    else if (request.session.user_auth=='1') { // read
        response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        response.write(`<script>alert("권한이 없습니다"); location.href = '/admin_signup'</script>`)
        response.end()
    }
    else {
        response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
    }
})

app.post("/admin_rentalmanage_resrv_reject", (request, response)=>{ // 회원가입 신청 거절(-> DB에서 삭제)
    if (request.session.user_auth=='2') { // read&write(관리자)
        conn.query(`delete from rental_user where user_id='${request.body.user_id}'`, function(err, rows, fields){
            if (err) throw err;
            response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
            response.write(`<script>alert("${request.body.user_id} : 회원가입 신청을 거절했습니다."); location.href = '/admin_signup' </script>`)
            response.end()
        })
    }
    else if (request.session.user_auth=='1') { // read
        response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        response.write(`<script>alert("권한이 없습니다"); location.href = '/admin_signup'</script>`)
        response.end()
    }
    else {
        response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
    }
})

app.post("/admin_signup_manage", (request, response)=>{ // 회원가입 신청 폼 수정(회원으로 등록 전 DB에서 사용자 정보 확인&수정)
    if (request.session.user_auth=='2') { // read&write(관리자)
        conn.query(`select * from rental_user where user_id='${request.body.signup_user_id}'`, function(err, rows, fields){
            if (err) throw err
            response.render('../views/admin_signup_rewirte.ejs', {rows_list : rows})
        })
    }
    else if (request.session.user_auth=='1') { // read
        response.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        response.write(`<script>alert("권한이 없습니다"); location.href = '/admin_signup'</script>`)
        response.end()
    }
    else response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
})

app.post("/admin_signup_rewrite", (request, response)=>{ // 회원가입 수정 완료
    conn.query(`update rental_user set user_school="${request.body.user_school}" , user_num="${request.body.user_num}",user_name="${request.body.user_name}",user_department="${request.body.user_department}",user_grade=${request.body.user_grade},user_id="${request.body.user_id}",user_attend_status=${request.body.user_attend_status},user_phone="${request.body.user_phone}" where user_id="${request.body.user_id}"`, function(err, rows, fields){
        if (err) throw err
        response.send(`<script>alert('수정되었습니다'); location.href = '/admin_signup'</script>`)
        console.log(request.body)
    })
})


// -- 신청 관리 관련 라우터
app.get("/admin_rentalmanage", (request, response)=>{ // 전체 검색
    if (request.session.user_auth == '2'){
        let qry1 = "SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
            WHERE m.ma_state = '1'"
    
        conn.query(qry1, function(err, reserv, fields){
            if (err) throw err;
            
            let qry2 = "SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
            WHERE m.ma_state = '2'"
            conn.query(qry2, function(err, using, fields){
                if (err) throw err;
    
                let qry3 = "SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
                WHERE m.ma_state = '3'"
                conn.query(qry3, function(err, ret, fields){
                    if (err) throw err;
    
                    response.render('../views/admin_rentalmanage.ejs', {reserv_list : reserv, using_list : using, return_list : ret})
                })
            })
        })
    }
    else response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
})

app.post("/admin_rentalmanage_search", (req, res)=>{ // 일부 검색
    let userID = req.body.user_id;
    if (userID == "") res.redirect('/admin_rentalmanage')
    else {
        let qry1 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
            WHERE m.ma_state = '1' AND u.user_id = ${userID}`

        conn.query(qry1, function(err, reserv, fields){
            if (err) throw err;
            
            let qry2 = `SELECT m.ma_id, u.user_id, u.user_status, u.ucdser_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
            WHERE m.ma_state = '2' AND u.user_id = ${userID}`
            conn.query(qry2, function(err, using, fields){
                if (err) throw err;

                let qry3 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
                FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
                WHERE m.ma_state = '3' AND u.user_id = ${userID}`
                conn.query(qry3, function(err, ret, fields){
                    if (err) throw err;

                    res.render('../views/admin_rentalmanage.ejs', {reserv_list : reserv, using_list : using, return_list : ret})
                })
            })
        })
    }
})

app.post("/admin_rentalmanage_resrv_recept", (req, res)=>{ // 예약 신청 수락
    let maID = req.body.resrv_recept_ma_id;
    let qry = `UPDATE rental_manage SET ma_state='1' WHERE ma_id='${maID}'`
    conn.query(qry, function(err, rows, fields){
        if (err) throw err;

        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        res.write(`<script>alert("${maID} : 예약 신청을 수락했습니다.")</script>`)
        res.end('<script></script>')
    })
})

app.post("/admin_rentalmanage_resrv_reject", (req, res)=>{ // 예약 신청 거절
    let maID = req.body.resrv_recept_ma_id;
    let qry = `DELETE FROM rental_manage WHERE ma_id='${maID}'`
    conn.query(qry, function(err, rows, fields){
        if (err) throw err;

        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        res.write(`<script>alert("${maID} : 예약 신청을 거절했습니다.")</script>`)
        res.end('<script></script>')
    })
})
app.post("/admin_rentalmanage_return", (req, res)=>{ // 비품 반납
    let maID = req.body.return_ma_id;
    let qry = `UPDATE rental_manage SET ma_state='3' WHERE ma_id='${maID}'`
    conn.query(qry, function(err, rows, fields){
        if (err) throw err;

        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        res.write(`<script>alert("${maID} : 반납으로 변경했습니다.")</script>`)
        res.end('<script>history.back()</script>')
    })
})
app.post("/admin_rentalmanage_return_cancel", (req, res)=>{ // 비품 반납 취소(반납 -> 사용 중)
    let maID = req.body.return_cancel_ma_id;
    let qry = `UPDATE rental_manage SET ma_state='2' WHERE ma_id='${maID}'`
    conn.query(qry, function(err, rows, fields){
        if (err) throw err;

        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        res.write(`<script>alert("${maID} : 반납에서 사용 중으로 변경했습니다.")</script>`)
        res.end('<script>history.back()</script>')
    })
})

// -- 유저 관리 관련 라우터
app.get("/admin_userstatus", (request, response)=>{ // 전체 유저 현황
    if (request.session.user_auth == '2') {
        conn.query(`select * from rental_user where user_auth=0 or user_auth=1 or user_auth=2`, function(err, rows, fields){
            if (err) throw err;
            let tmp='<h1>유저 현황</h1>'
            tmp+='<table border="1"><tr><th>INDEX</th><th>권한등급</th><th>학교</th><th>학과</th><th>학년</th><th>학번</th><th>이름</th><th>ID</th><th>재학여부</th><th>비밀번호 틀린 횟수</th></tr>'
            for(let a of rows){
                tmp+=`<tr><td>${a.uid}</td><td>${a.user_auth}</td><td>${a.user_school}</td><td>${a.user_department}</td><td>${a.user_grade}</td><td>${a.user_num}</td><td>${a.user_name}</td><td>${a.user_id}</td><td>${a.user_attend_status}</td><td>${a.user_status}</td></tr>`
            }
            tmp+='</table>'
            fs.readFile("public/admin/admin_userstatus.html", (error,data)=>{
                response.writeHead(200,{'Content-Type' : "text/html"})
                response.write(data+tmp)
                response.end()
            })
        })
    }
    else response.status(404.1).send('<h1>잘못된 접근입니다😥</h1> <button onclick="location.href=`/`">메인으로 돌아가기</button>');
})

app.post("/admin_userstatus", (request, response)=>{ // 검색된 유저 현황
    conn.query(`select * from rental_user where user_school="${request.body.user_school}" and user_num="${request.body.user_num}" and user_name="${request.body.user_name}"`, function(err, rows, fields){
        if (err) throw err;
        user_uid=rows[0]['uid'];
        let tmp='<h1>유저 현황</h1>'
        tmp+='<table border="1"><tr><th>INDEX</th><th>권한등급</th><th>학교</th><th>학과</th><th>학년</th><th>학번</th><th>이름</th><th>ID</th><th>재학여부</th><th>비밀번호 틀린 횟수</th></tr>'
        for(let a of rows){
            tmp+=`<tr><td>${a.uid}</td><td>${a.user_auth}</td><td>${a.user_school}</td><td>${a.user_department}</td><td>${a.user_grade}</td><td>${a.user_num}</td><td>${a.user_name}</td><td>${a.user_id}</td><td>${a.user_attend_status}</td><td>${a.user_status}</td></tr>`
        }
        tmp+='</table>'
        fs.readFile("public/admin/admin_backuser.html", (error,data)=>{
            response.writeHead(200,{'Content-Type': 'text/html'})
            response.write(data+tmp)
            response.end()
        })
    })
})
app.post("/admin_changeauth", (request, response)=>{ // 권한 수정
    conn.query(`update rental_user set user_auth="${request.body.user_change_auth}" where uid="${user_uid}"`, function(err){
        if(err) throw err;
        response.send(`<script>alert('권한이 변경되었습니다.'); location.href = '/admin_userstatus'</script>`)
    })
})
app.post("/admin_changepw", (request, response)=>{ // 비밀번호 수정(비밀번호를 잃어버렸을 경우)
    if(request.body.user_change_pw==request.body.user_change_repw){
        let tmp1 = /^(?=.*[a-zA-Z])[a-zA-Z\d-_]{5,20}/g
        let tmp2 = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z\d~!@#$%^&*]{8,16}$/g
        if(tmp1.test(request.body.user_id)==true){
            if(tmp2.test(request.body.user_pw)==true){
                conn.query(`update rental_user set user_pw="${request.body.user_change_pw}" where uid="${user_uid}"`, function(err){
                    if(err) throw err;
                    response.send(`<script>alert('비밀번호가 변경되었습니다.'); location.href = '/admin_userstatus'</script>`)
                })
            }
        }
    }
})

// -- 오류 관련 라우터
app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

app.use(function(req, res, next) {
    res.status(404).send('Sorry cant find that!');
})

// -- listen
app.listen(9999, ()=>{
    console.log('server start')
})