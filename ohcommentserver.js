var	url=require('url');
var http=require('http');
var DATABASE=require('./databasemanager').DATABASE;
var nodemailer = require('nodemailer');
var fs = require('fs');

var config=JSON.parse(fs.readFileSync('ohcommentserver.json', 'utf8'));

http.createServer(function (REQ, RESP) {
	console.log ('REQUEST: '+REQ.url);
	
	var url_parts = url.parse(REQ.url,true);

	var DB=new DATABASE('ohcommentserver');
	DB.setCollection('comments');

	var admin_code=url_parts.query.admin_code||'';
	var admin=false;
	if (admin_code===config.admin_code) admin=true;
	
	if (REQ.method == 'OPTIONS') {
		var headers = {};
		
		//allow cross-domain requests
		
		// IE8 does not allow domains to be specified, just the *
		// headers["Access-Control-Allow-Origin"] = req.headers.origin;
		//headers["Access-Control-Allow-Origin"] = "*";

		//headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
		headers["Access-Control-Allow-Methods"] = "GET";
		headers["Access-Control-Allow-Credentials"] = false;
		headers["Access-Control-Max-Age"] = '86400'; // 24 hours
		headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
		RESP.writeHead(200, headers);
		RESP.end();
	}
	else if(REQ.method=='GET') {
		if (url_parts.pathname=='/ohcommentserver/getAllComments') {
			var page_id=url_parts.query.page_id||'';
			var status=url_parts.query.status||'';
			console.log('get_all_comments');
            get_all_comments(page_id,status,admin,function(resp) {
            	console.log(page_id);
            	console.log(JSON.stringify(resp));
				send_json_response(resp);
			});
		}
		else if (url_parts.pathname=='/ohcommentserver/getComment') {
			var comment_id=url_parts.query.comment_id||'';
			console.log('get_comment');
            get_comment(comment_id,function(resp) {
            	console.log(comment_id);
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
				status:'pending',
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
				if (resp.success) {
					var url0=config.site_url+'/commentview/?comment_id='+comment0.comment_id;
					var message0='A new comment has been received from page: '+comment0.page_id+'.\n\n';
					message0+='Name: '+comment0.name+', date: '+comment0.date+' email: '+comment0.email+', website: '+comment0.website+'\n\n';
					message0+='Click here to accept or reject this comment: '+url0+'\n\n';
					message0+=comment0.content+'\n\n\n';
					message0+=JSON.stringify(comment0);
					send_email({from:config.from_email,to:config.to_email,subject:'new comment received',text:message0},
						function(err,info) {
							console.log('Sent email (or tried)...'+err);
							console.log(JSON.stringify(info));
						}
					);
				}
				send_json_response(resp);
			});
		}
		else if (url_parts.pathname=='/ohcommentserver/setCommentStatus') {
			var comment_id=url_parts.query.comment_id;
			DB.find({comment_id:comment_id},{status:1},function(tmp) {
				if ((tmp.success)&&(tmp.docs.length==1)) {
					DB.update({_id:tmp.docs[0]._id},{$set:{status:url_parts.query.status}},function(err) {
						if (!err) send_json_response({success:true});
						else send_json_response({success:false,error:JSON.stringify(err)}); 
					});
				}
				else {
					send_json_response({success:false,error:'Unable to find comment: '+comment_id+' '+tmp.docs.length});
				}
			});
		}
		else if (url_parts.pathname=='/ohcommentserver/removeComment') {
			var comment_id=url_parts.query.comment_id;
			DB.remove({comment_id:comment_id},function(err) {
				if (!err) send_json_response({success:true});
				else send_json_response({success:false,error:JSON.stringify(err)}); 
			});
		}
		else {
			send_json_response({success:false,error:'Unrecognized url path.'});
		}
	}
	else if(REQ.method=='POST') {
        send_json_response({success:false,error:'Unexpected POST: '});
	}

	var the_transporter = nodemailer.createTransport();
	function send_email(obj,callback) {
		the_transporter.sendMail(obj,callback);
	}

	function get_comment(comment_id,callback) {
		var XX={page_id:1,name:1,date:1,content:1};
		var YY={comment_id:comment_id};
		{
			XX.email=1; XX.webpage=1; XX.comment_id=1; XX.status=1;
		}
		DB.find(YY,XX,function(tmp) {
			var ret={success:tmp.success,error:tmp.error,comments:tmp.docs};
			callback(ret);
		});
	}
	function get_all_comments(page_id,status,admin,callback) {
		var XX={page_id:1,name:1,date:1,content:1};
		var YY={};
		if ((page_id)||(!admin)) YY.page_id=page_id;
		if (status) YY.status=status;
		else YY.status={$ne:'trashed'};
		if (admin) {
			XX.email=1; XX.webpage=1; XX.comment_id=1; XX.status=1;
		}
		else {
			YY.status='accepted';
		}
		DB.find(YY,XX,function(tmp) {
			if ((tmp.success)&&(tmp.docs)&&(!admin)) {
				for (var j=0; j<tmp.docs.length; j++) {
					delete tmp.docs[j]._id;
				}
			}
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
