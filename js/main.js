const express = require('express')
const fs = require('fs')
const bodyParser=require('body-parser')
const { json } = require('express/lib/response')
const app = express()
const db=require("C:/Users/JH Seo/Desktop/beharbor/js/database.js")
const conn=db.init()
db.connect(conn)

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
    
})

app.get("/signup", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/signup.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.post("/signup", (request, response)=>{
    
})

app.get("/admin_main", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.get("/admin_signup", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
    })
})

app.get("/admin_signstatus", (request, response)=>{
    fs.readFile("C:/Users/18284/Desktop/Snipe_IT_Rental/html/admin_main.html", (error,data)=>{
        response.writeHead(200,{'Content-Type' : "text/html"})
        response.write(data)
        response.end()
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