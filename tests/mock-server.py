import http.server, json, random, datetime, sys, urllib.parse, os
random.seed(1)
HTML = sys.argv[1]
PORT = int(sys.argv[2])
joins = {1:"2025-05-29",2:"2015-03-27",3:"2015-03-27",5:"2019-08-15",7:"2017-10-10",9:"2015-09-19",10:"2019-08-15",11:"2019-08-15",13:"2018-07-25",14:"2018-06-29",16:"2018-12-10",17:"2016-10-09",19:"2018-10-29",20:"2018-02-27",26:"2015-03-27",27:"2021-08-29",28:"2021-09-26",42:"2022-06-18",46:"2022-12-30",55:"2018-07-28",57:"2024-03-06",60:"2023-09-25",62:"2024-04-27",63:"2024-05-14",64:"2023-09-24",66:"2025-04-09",69:"2025-09-06",76:"2025-12-10",89:"2026-02-26",105:"2026-08-03",106:"2015-03-27",107:"2026-09-15",108:"2026-10-05"}
names={1:"Артём",2:"Данил",3:"Дима",5:"Наташа",7:"Адлет",9:"Ярик",10:"Артур",11:"Анастасия",13:"Аня",14:"Алиса",16:"Есет",17:"Саша",19:"Ваня",20:"Влада",26:"Серёга",27:"Маша",28:"Егор",42:"Лера",46:"Лекса",55:"Влад",57:"Яся",60:"Гоннор",62:"Оля",63:"Геля",64:"Тишина",66:"Валик",69:"Женя",76:"Миша О.",89:"Настя",105:"Ульяна",106:"Миша А.",107:"Алёна",108:"Евджений"}
chats=[(101,"Original"),(102,"Premium"),(103,"Colony"),(104,"Colony Chat"),(105,"Мемы")]
rows=[]
today=datetime.date(2026,11,10)
for uid,j in joins.items():
    d=datetime.date.fromisoformat(j)
    while d<=today:
        tot=0
        for pk,t in chats:
            if random.random()<0.55:
                m=int(random.expovariate(1/25))+1
                tot+=m
                rows.append({"stat_date":d.isoformat(),"chat_pk":pk,"chat_title":t,"user_pk":uid,"first_name":names[uid],"messages_count":m,"voice_count":random.randint(0,3),"video_note_count":random.randint(0,2),"sticker_count":random.randint(0,6)})
        d+=datetime.timedelta(days=1)
print("rows",len(rows),file=sys.stderr)
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        u=urllib.parse.urlparse(self.path); q=urllib.parse.parse_qs(u.query)
        if u.path in("/","/index.html"):
            b=open(HTML,"rb").read(); self.send_response(200); self.send_header("Content-Type","text/html; charset=utf-8"); self.send_header("Content-Length",str(len(b))); self.end_headers(); self.wfile.write(b); return
        if u.path=="/api/v1/excel/user_daily_stats":
            lim=int(q.get("limit",["5000"])[0]); cur=int(q.get("cursor",["0"])[0])
            f=q.get("stat_date_from",[""])[0]; t=q.get("stat_date_to",["9999"])[0]
            sel=[r for r in rows if f<=r["stat_date"]<=t] if f else rows
            part=sel[cur:cur+lim]; nxt=str(cur+lim) if cur+lim<len(sel) else None
            b=json.dumps({"items":part,"next_cursor":nxt}).encode()
            self.send_response(200); self.send_header("Content-Type","application/json"); self.send_header("Content-Length",str(len(b))); self.end_headers(); self.wfile.write(b); return
        self.send_response(404); self.end_headers()
http.server.ThreadingHTTPServer(("127.0.0.1",PORT),H).serve_forever()
