import Server from "cobic-server";

const server = new Server().setPort(8080);

server.listen(()=>{
    console.log("listening http://localhost:8080/");
});

server.GET("/", (req, res)=>{
    res.html(200, "<h1>Welcome to WeHateExpress.com</h1>");
});

server.GET("/admin",
    Server.jwt((decoded, req, res)=>{
        if (!decoded) return res.html(400, "<h1>You're not an admin</h1>");
    }),
    (req, res)=>{
        res.html(200, "<h1>Welcome, admin</h1>");
    }
);

server.GET("/login/:username", 
    (req, res)=>{
        if (req.slugs.username != "coby") res.html(400, "<h1>Invalid login</h1>");
    },
    (req, res)=>{
        res.setJWT({ name: "Coby", admin: true }, 60 * 60 * 24);
        res.html(200, "<h1>Welcome, Coby!</h1>");
    }
);

server.GET("/logout", (req, res)=>{
    res.deleteCookie("jwt");
    res.html(200, "<h1>Logged out</h1>");
});

server.GET("/api", (req, res)=>{
    res.json(200, { data: "Hello, Express hater" });
});

server.GET("/say/:quote", (req, res)=>{
    res.html(200, `<h1>${req.slugs.quote}</h1>`);
});
