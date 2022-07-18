const express = require('express')
const fs = require('fs')
const bodyParser=require('body-parser')
const { json } = require('express/lib/response')
const app = express()
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
const db=require("C:/Users/18284/Desktop/Snipe_IT_Rental/js/database.js")
const conn=db.init()
app.set('view engine','ejs')
db.connect(conn)
app.set('views',__dirname+'/views')
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true}));

// -- 기본 라우터
app.get("/", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

// -- 로그인 관련 라우터
app.get("/login", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/login.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.post("/login",(request,response)=>{
    conn.query("select * from rental_user", function(err, rows, fields){
        if (err) throw err;
        for(let a of rows){
            if(request.body.user_id==a.user_id){
			    flag=1;
			    if(request.body.user_pw==a.user_pw){
    				flag=2;
	    			break;
		    	}
    			break;
	    	}
        }
        if(flag==0){
            response.send(`<script>alert('ID가 없습니다'); location.href = 'http://localhost:9999/login'</script>`)
        }
        else if(flag==1){
            conn.query(`update rental_user set user_status=user_status+1 where user_id="${request.body.user_id}"`, function(err){
                if(err) throw err;
                conn.query(`select * from rental_user where user_id="${request.body.user_id}"`, function(err, rows, fields){
                    if (err) throw err;
                    if(rows[0]['user_status']<5) response.send(`<script>alert('${rows[0]['user_name']}님 PW가 ${rows[0]['user_status']}회 틀렷습니다'); location.href = 'http://localhost:9999/login'</script>`)
                    else response.send(`<script>alert('${rows[0]['user_name']}님 PW가 횟수초과로 로그인 불가능합니다'); location.href = 'http://localhost:9999/login'</script>`)
                })
            })
        }
        else if(flag==2){
            conn.query(`select * from rental_user where user_id="${request.body.user_id}"`, function(err, rows, fields){
                if (err) throw err;
                if(rows[0]['user_status']<5){
                    conn.query(`update rental_user set user_status=0, user_login_date=now() where user_id="${request.body.user_id}"`, function(err){
                        if(err) throw err;
                        if(rows[0]['user_auth']==2||rows[0]['user_auth']==1) response.send(`<script> location.href = 'http://localhost:9999/admin_main'</script>`)
                        else response.send(`<script> location.href = 'http://localhost:9999/'</script>`)
                    })
                }
                else response.send(`<script>alert('${rows[0]['user_name']}님 PW가 횟수초과로 로그인 불가능합니다'); location.href = 'http://localhost:9999/login'</script>`)
            })
        }

    })
})

// -- 메인 관련 라우터
app.get("/admin_main", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

// -- 회원가입 관련 라우터
app.get("/admin_signup", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin/admin_signup.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.post("/admin_signup", (request, response)=>{
    conn.query("select * from rental_user", function(err, rows, fields){
        if (err) throw err;
        let tmp1 = /^(?=.*[a-zA-Z])[a-zA-Z\d-_]{5,20}/g
        let tmp2 = /^(?=.*[a-zA-Z])(?=.*[!@#$%^&*])[a-zA-Z\d~!@#$%^&*]{8,16}$/g
        let login_flag=0
        let flag=0
        if(tmp1.test(request.body.user_id)==true){
            if(tmp2.test(request.body.user_pw)==true){login_flag=1}
            else{
                response.send(`<script>alert('비밀번호는 8~16자로 입력해주세요. * 한글 입력 금지, 특수문자 및 영문자 1회 이상 입력 *'); location.href = 'http://localhost:9999/admin_signup'</script>`)
                login_flag=0
            }
        }
        else {
            response.send(`<script>alert('ID는 5~20자로 입력해주세요. * 한글 입력금지, 영문자 1개 이상 입력, 특수문자 '-', '_' 가능'); location.href = 'http://localhost:9999/admin_signup'</script>`)
            login_flag=0
        }
        for(let a of rows){
            if(a.user_id==request.body.user_id){
                flag=1
                response.send(`<script>alert('ID가 존재합니다'); location.href = 'http://localhost:9999/admin_signup'</script>`)
                break;
            }
        }
        if(flag==0){
            conn.query(`insert into rental_user values(NULL,"${request.body.user_school}","${request.body.user_num}","${request.body.user_name}","${request.body.user_department}","${request.body.user_grade}","${request.body.user_id}","${request.body.user_pw}","${request.body.user_attend_status}","${request.body.user_phone}",now(),NULL,"0","0")`, function(err){
                if (err) throw err;
                response.send(`<script> alert('회원가입 되었습니다'); window.close()</script>`)
            })
            
        }
    })
})


// -- 신청 관리 관련 라우터
app.get("/admin_rentalmanage", (request, response)=>{ // 전체 검색
    let qry1 = "SELECT m.ma_id, u.uid, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
        FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON u.pid = a.pid \
        WHERE m.ma_state = '1'"

    conn.query(qry1, function(err, reserv, fields){
        if (err) throw err;
        
        let qry2 = "SELECT m.ma_id, u.uid, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
        FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON u.pid = a.pid \
        WHERE m.ma_state = '2'"
        conn.query(qry2, function(err, using, fields){
            if (err) throw err;

            let qry3 = "SELECT m.ma_id, u.uid, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON u.pid = a.pid \
            WHERE m.ma_state = '3'"
            conn.query(qry3, function(err, ret, fields){
                if (err) throw err;

                response.render('admin_rentalmanage.ejs', {reserv_list : reserv, using_list : using, return_list : ret})
            })
        })
    })
})

app.post("/admin_rentalmanage_search", (req, res)=>{ // 일부 검색
    let userID = req.body.user_id;
    let qry1 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
        FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
        WHERE m.ma_state = '1' AND u.user_id = ${userID}`

    conn.query(qry1, function(err, reserv, fields){
        if (err) throw err;
        
        let qry2 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
        FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
        WHERE m.ma_state = '2' AND u.user_id = ${userID}`
        conn.query(qry2, function(err, using, fields){
            if (err) throw err;

            let qry3 = `SELECT m.ma_id, u.user_id, u.user_status, u.user_auth, u.user_school, u.user_num, u.user_name, m.pid, a.name, m.ma_recept_date, m.ma_start_date, m.ma_using_period, m.ma_return_date,  m.ma_qty \
            FROM rental_manage m RIGHT JOIN rental_user u ON m.uid = u.uid RIGHT JOIN assets a ON m.pid = a.id \
            WHERE m.ma_state = '3' AND u.user_id = ${userID}`
            conn.query(qry3, function(err, ret, fields){
                if (err) throw err;

                response.render('admin_rentalmanage.ejs', {reserv_list : reserv, using_list : using, return_list : ret})
            })
        })
    })
})

app.post("/admin_rentalmanage_resrv_recept", (req, res)=>{ // 예약 신청 수락
    let maID = req.body.resrv_recept_ma_id;
    let qry = `UPDATE rental_manage SET ma_state='1' WHERE ma_id='${maID}'`
    conn.query(qry, function(err, rows, fields){
        if (err) throw err;

        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        res.write(`<script>alert("${maID} : 예약 신청을 수락했습니다.")</script>`)
        res.end('<script>history.back()</script>')
    })
})
app.post("/admin_rentalmanage_resrv_reject", (req, res)=>{ // 예약 신청 거절
    let maID = req.body.resrv_recept_ma_id;
    let qry = `DELETE FROM rental_manage WHERE ma_id='${maID}'`
    conn.query(qry, function(err, rows, fields){
        if (err) throw err;

        res.writeHead(200, {'Content-type':"text/html; charset=utf-8"})
        res.write(`<script>alert("${maID} : 예약 신청을 거절했습니다.")</script>`)
        res.end('<script>history.back()</script>')
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

// -- 관리자 main 관련 라우터
app.get("/admin_manage", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

// -- 유저 관리 관련 라우터
app.get("/admin_userstatus", (request, response)=>{
    conn.query(`select * from rental_user`, function(err, rows, fields){
        if (err) throw err;
        let tmp='<h1>유저 현황</h1>'
        tmp+='<table border="1"><tr><th>INDEX</th><th>권한등급</th><th>학교</th><th>학과</th><th>학년</th><th>이름</th><th>ID</th><th>재학여부</th><th>비밀번호 틀린 횟수</th></tr>'
        for(let a of rows){
            tmp+=`<tr><td>${a.uid}</td><td>${a.user_auth}</td><td>${a.user_school}</td><td>${a.user_department}</td><td>${a.user_grade}</td><td>${a.user_name}</td><td>${a.user_id}</td><td>${a.user_attend_status}</td><td>${a.user_status}</td></tr>`
        }
        tmp+='</table>'
        fs.readFile("C:/Users/18284/Desktop/jscript/js/admin/admin_userstatus.html", (error,data)=>{
            response.writeHead(200,{'Content-Type' : "text/html"})
            response.write(data+tmp)
            response.end()
        })
    })
})

app.post("/admin_userstatus", (request, response)=>{
    conn.query(`select * from rental_user where user_school="${request.body.user_school}" and user_num="${request.body.user_school}" and user_name="${request.body.user_name}"`, function(err, rows, fields){
        if (err) throw err;
        user_uid=request.body.uid;
        let tmp='<h1>유저 현황</h1>'
        tmp+='<table border="1"><tr><th>INDEX</th><th>권한등급</th><th>학교</th><th>학과</th><th>학년</th><th>이름</th><th>ID</th><th>재학여부</th><th>비밀번호 틀린 횟수</th></tr>'
        for(let a of rows){
            tmp+=`<tr><td>${a.uid}</td><td>${a.user_auth}</td><td>${a.user_school}</td><td>${a.user_department}</td><td>${a.user_grade}</td><td>${a.user_name}</td><td>${a.user_id}</td><td>${a.user_attend_status}</td><td>${a.user_status}</td></tr>`
        }
        tmp+='</table>'
        fs.readFile("C:/Users/18284/Desktop/jscript/js/admin/admin_backuser.html", (error,data)=>{
            response.writeHead(200,{'Content-Type': 'text/html'})
            response.write(data+tmp)
            response.end()
        })
    })
})
app.post("/admin_changeauth", (request, response)=>{
    conn.query(`update rental_user set user_auth="${request.body.user_change_auth}" where uid="${user_uid}"`, function(err){
        if(err) throw err;
        response.send(`<script>alert('권한이 변경되었습니다.'); location.href = 'http://localhost:9999//admin_userstatus'</script>`)
    })
})
app.post("/admin_changepw", (request, response)=>{
    if(request.body.user_change_pw==request.body.user_change_repw){
        conn.query(`update rental_user set user_pw="${request.body.user_change_pw}" where uid="${user_uid}}"`, function(err){
            if(err) throw err;
            response.send(`<script>alert('비밀번호가 변경되었습니다.'); location.href = 'http://localhost:9999//admin_userstatus'</script>`)
        })
    }
})

// -- 오류 관련 라우터
app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send('Something broke!')
})

app.use(function(req, res, next) {
    res.status(404).send('Sorry cant find that!');
});

// -- listen
app.listen(9999, ()=>{
    console.log('server start')
})