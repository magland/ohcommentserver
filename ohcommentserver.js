var	url=require('url');
var http=require('http');
var DATABASE=require('./databasemanager').DATABASE;

var config={listen_port:9001}; //put this in ohcommentserver.json

http.createServer(function (REQ, RESP) {
	console.log ('REQUEST: '+REQ.url);
	
	var url_parts = url.parse(REQ.url,true);

	var DB=new DATABASE('ohcommentserver');
	DB.setCollection('comments');
	
	if (REQ.method == 'OPTIONS') {
		var headers = {};
		
		//allow cross-domain requests
		
		// IE8 does not allow domains to be specified, just the *
		// headers["Access-Control-Allow-Origin"] = req.headers.origin;
		headers["Access-Control-Allow-Origin"] = "*";
		headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
		headers["Access-Control-Allow-Credentials"] = false;
		headers["Access-Control-Max-Age"] = '86400'; // 24 hours
		headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
		RESP.writeHead(200, headers);
		RESP.end();
	}
	else if(REQ.method=='GET') {
		if (url_parts.pathname=='/ohcommentserver/getAllComments') {
			var page_id=url_parts.query.page_id||'';
			console.log('get_all_comments');
            get_all_comments(page_id,function(resp) {
            	console.log(page_id);
            	console.log(JSON.stringify(resp));
				send_json_response(resp);
			});
		}
		else if (url_parts.pathname=='/ohcommentserver/addComment') {
			var comment0={
				page_id:url_parts.query.page_id,
				name:url_parts.query.name,
				date:(new Date()).getTime(),
				date_human:new Date(),
				email:url_parts.query.email,
				website:url_parts.query.website,
				content:url_parts.query.content,
				comment_id:make_random_id()
			};
			if ((!comment0.page_id)||(!comment0.name)||(!comment0.email)||(!comment0.content)||(!comment0.comment_id)) {
				send_json_response({success:false,error:"invalid comment"});
				return;
			}
			if (JSON.stringify(comment0).length>5000) {
				send_json_response({success:false,error:"invalid comment (*)"});
				return;
			}
			add_comment(comment0,function(resp) {
				send_json_response(resp);
			});

		}
		else {
			send_json_response({success:false,error:'Unrecognized url path.'});
		}
	}
	else if(REQ.method=='POST') {
        send_json_response({success:false,error:'Unexpected POST: '});
	}

	function get_all_comments(page_id,callback) {
		DB.find({page_id:page_id},{page_id:1,name:1,email:1,date:1,webpage:1,content:1,comment_id:1},function(tmp) {
			var ret={success:tmp.success,error:tmp.error,comments:tmp.docs};
			callback(ret);
		});
	}
	function add_comment(comment0,callback) {
		DB.insert(comment0,function(err) {
			if (!err) callback({success:true});
			else callback({success:false,error:JSON.stringify(err)});
		});
	}
	
	function send_json_response(obj) {
		RESP.writeHead(200, {"Access-Control-Allow-Origin":"*", "Content-Type":"application/json"});
		RESP.end(JSON.stringify(obj));
	}

	function make_random_id(numchars) {
		if (!numchars) numchars=10;
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		for( var i=0; i < numchars; i++ ) text += possible.charAt(Math.floor(Math.random() * possible.length));
		return text;
	}
}).listen(config.listen_port);
console.log ('Listening on port '+config.listen_port);
