var	url=require('url');
var http=require('http');
var fs=require('fs');
var DATABASE=require('./databasemanager').DATABASE;
var x=3;

http.createServer(function (REQ, RESP) {
	console.log ('REQUEST: '+REQ.url);
	
	var url_parts = url.parse(REQ.url,true);
	
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
            get_all_comments(page_id,function(resp) {
				send_json_response(resp);
			});
		}
		else {
			send_json_response({success:false,error:'Unrecognized url path.'});
		}
	}
	else if(REQ.method=='POST') {
        send_json_response({success:false,error:'Unexpected POST: '});
        
		//upload a file!
		
        /*
		if (url_parts.pathname=='/wisdmfileserver/setFileData') {
			var fsname=url_parts.query.fsname||'';
			var path=url_parts.query.path||'';
			var text=url_parts.query.text||'';
			
			if (!create_path_for_file(path,wisdmconfig.wisdmfileserver.data_path+'/files/'+fsname)) {
				send_json({success:false,error:'Unable to create folder for file.'});
				return;
			}
			
			var path0=wisdmconfig.wisdmfileserver.data_path+'/files/'+fsname+'/'+path;
			//write to a temporary file (later we'll move it over)
			var tmppath0=path0+'.'+make_random_id(4)+'.tmp';
			
			var file_size=REQ.headers['content-length'];
			if (file_size>10*1000*1000) {
				send_json_response({success:false,error:'File is too large: '+file_size});
				return;
			}
			
			var out_stream=fs.createWriteStream(tmppath0);
			
			var byte_count=0;
			
			var done=false;
			REQ.on('data',function(d) {
				if (done) return;
				out_stream.write(d);
				byte_count+=d.length;
			});
			REQ.on('end',function() {
				if (done) return;
				if (byte_count!=file_size) {
					send_json_response({success:false,error:'Unexpected file size: '+byte_count+' <> '+file_size});
					done=true;
					return;
				}
				if (file_exists(path0)) {
					remove_file(path0);
				}
				if (!rename_file(tmppath0,path0)) {
					send_json_response({success:false,error:'Problem renaming file'});
					done=true;
					return;
				}
				send_json_response({success:true});
				done=true;
			});
		}
		else {
			send_json_response({success:false,error:'Unexpected path for POST: '+url_parts.pathname});
		}
        */
	}
	
	function send_json_response(obj) {
		RESP.writeHead(200, {"Access-Control-Allow-Origin":"*", "Content-Type":"application/json"});
		RESP.end(JSON.stringify(obj));
	}
	function send_text_response(text) {
		RESP.writeHead(200, {"Access-Control-Allow-Origin":"*", "Content-Type":"text/plain"});
		RESP.end(text);
	}
}).listen(config.listen_port);
console.log ('Listening on port '+config.listen_port);
