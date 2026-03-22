import re

f = open('src/app/page.tsx', 'r')
c = f.read()
f.close()

# Add animation keyframes
anim = """@keyframes logoFadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes logoLine { from { width:0; } to { width:180px; } }
        @keyframes logoShimmer { 0% { background-position:-200px 0; } 100% { background-position:200px 0; } }
        """
c = c.replace('@keyframes slideUp', anim + '@keyframes slideUp')

# Replace h1 logo
old_h1 = '<h1 className="text-5xl font-bold mb-1 tracking-tight">Newzplay</h1>'
new_h1 = """<div style={{marginBottom:'6px'}}>
                  <span className="font-sans" style={{fontSize:'44px',fontWeight:800,color:'#111',letterSpacing:'-1px',display:'inline-block',animation:'logoFadeUp 0.4s ease forwards'}}>NEWZ</span>
                  <span className="font-sans" style={{fontSize:'44px',fontWeight:800,color:'#F59E0B',letterSpacing:'-1px',display:'inline-block',animation:'logoFadeUp 0.4s ease 0.2s forwards',opacity:0}}>PLAY</span>
                </div>
                <div style={{height:'2px',background:'linear-gradient(90deg,transparent,#F59E0B,transparent)',backgroundSize:'200px 100%',animation:'logoLine 0.5s ease 0.5s forwards, logoShimmer 1.5s ease-in-out 0.6s infinite',width:0,borderRadius:'1px',margin:'0 auto 10px'}} />"""
c = c.replace(old_h1, new_h1)

# Replace tagline
old_tag = '<p className="text-sm text-gray-400 font-sans">Play the news.</p>'
new_tag = '<p className="font-sans" style={{fontFamily:"Georgia,serif",fontStyle:"italic",fontSize:"14px",color:"#737373",animation:"logoFadeUp 0.4s ease 1s forwards",opacity:0}}>play the news.</p>'
c = c.replace(old_tag, new_tag)

f = open('src/app/page.tsx', 'w')
f.write(c)
f.close()
print('done')
