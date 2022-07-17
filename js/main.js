const express = require('express')
const fs = require('fs')
const bodyParser=require('body-parser')
const { json } = require('express/lib/response')
const app = express()
const db=require("C:/Users/18284/Desktop/Snipe_IT_Rental/js/database.js")
const conn=db.init()
app.set('view engine','ejs')
db.connect(conn)
app.set('views',__dirname+'/views')
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true}));

app.get("/", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

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
                        response.send(`<script> location.href = 'http://localhost:9999'</script>`)
                    })
                }
                else response.send(`<script>alert('${rows[0]['user_name']}님 PW가 횟수초과로 로그인 불가능합니다'); location.href = 'http://localhost:9999/login'</script>`)
            })
        }

    })
})

app.get("/admin_main", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.get("/admin_signup", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_signup.html", (error,data)=>{
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



app.get("/admin_rentalmanage", (request, response)=>{
    conn.query(`select * from rental_manage`, function(err, rows, fields){
        if (err) throw err;
        let tmp='<h1>대기 현황</h1>'
        tmp+='<table border="1"><tr><th>ID</th><th>교과목 이름</th><th>학점</th></tr>'
        for(let a of rows){
            tmp+=`<tr><td>${a.user_id}</td><td>${a.enrol_id}</td><td>${a.enrol_score} </td></tr>`
        }
        tmp+='</table>'
        fs.readFile("C:/Users/18284/Desktop/jscript/js/admin_rentalmanage.html", (error,data)=>{
            response.writeHead(200,{'Content-Type' : "text/html"})
            response.write(data+tmp)
            response.end()
        })
    })
})

app.get("/admin_manage", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.get("/admin_userstatus", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.listen(9999, ()=>{
    console.log('server start')
})