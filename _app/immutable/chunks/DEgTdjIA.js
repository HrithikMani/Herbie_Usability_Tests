var Hn=Array.isArray,tn=Array.prototype.indexOf,jn=Array.from,Bn=Object.defineProperty,ht=Object.getOwnPropertyDescriptor,nn=Object.getOwnPropertyDescriptors,Un=Object.prototype,Vn=Array.prototype,rn=Object.getPrototypeOf;const Gn=()=>{};function Kn(t){return t()}function mt(t){for(var n=0;n<t.length;n++)t[n]()}const T=2,gt=4,Q=8,it=16,I=32,j=64,G=128,w=256,K=512,v=1024,x=2048,F=4096,b=8192,tt=16384,en=32768,At=65536,$n=1<<17,ln=1<<19,kt=1<<20,dt=Symbol("$state"),Zn=Symbol("legacy props"),zn=Symbol("");function Dt(t){return t===this.v}function sn(t,n){return t!=t?n==n:t!==n||t!==null&&typeof t=="object"||typeof t=="function"}function It(t){return!sn(t,this.v)}function an(t){throw new Error("https://svelte.dev/e/effect_in_teardown")}function un(){throw new Error("https://svelte.dev/e/effect_in_unowned_derived")}function on(t){throw new Error("https://svelte.dev/e/effect_orphan")}function fn(){throw new Error("https://svelte.dev/e/effect_update_depth_exceeded")}function Wn(){throw new Error("https://svelte.dev/e/hydration_failed")}function Xn(t){throw new Error("https://svelte.dev/e/props_invalid_value")}function Jn(){throw new Error("https://svelte.dev/e/state_descriptors_fixed")}function Qn(){throw new Error("https://svelte.dev/e/state_prototype_fixed")}function _n(){throw new Error("https://svelte.dev/e/state_unsafe_local_read")}function cn(){throw new Error("https://svelte.dev/e/state_unsafe_mutation")}let nt=!1;function tr(){nt=!0}const nr=1,rr=2,er=4,lr=8,sr=16,ar=1,ur=2,or=4,fr=8,ir=16,_r=1,cr=2,vn="[",pn="[!",hn="]",Rt={},vr=Symbol();function xt(t){console.warn("https://svelte.dev/e/hydration_mismatch")}let f=null;function Et(t){f=t}function pr(t,n=!1,r){f={p:f,c:null,e:null,m:!1,s:t,x:null,l:null},nt&&!n&&(f.l={s:null,u:null,r1:[],r2:_t(!1)})}function hr(t){const n=f;if(n!==null){const a=n.e;if(a!==null){var r=o,e=u;n.e=null;try{for(var l=0;l<a.length;l++){var s=a[l];W(s.effect),z(s.reaction),Lt(s.fn)}}finally{W(r),z(e)}}f=n.p,n.m=!0}return{}}function rt(){return!nt||f!==null&&f.l===null}function _t(t,n){var r={f:0,v:t,reactions:null,equals:Dt,rv:0,wv:0};return r}function dr(t){return St(_t(t))}function dn(t,n=!1){var e;const r=_t(t);return n||(r.equals=It),nt&&f!==null&&f.l!==null&&((e=f.l).s??(e.s=[])).push(r),r}function Er(t,n=!1){return St(dn(t,n))}function St(t){return u!==null&&!m&&u.f&T&&(g===null?Cn([t]):g.push(t)),t}function En(t,n){return u!==null&&!m&&rt()&&u.f&(T|it)&&(g===null||!g.includes(t))&&cn(),yn(t,n)}function yn(t,n){return t.equals(n)||(t.v,t.v=n,t.wv=$t(),Ot(t,x),rt()&&o!==null&&o.f&v&&!(o.f&(I|j))&&(k===null?Nn([t]):k.push(t))),n}function yr(t,n=1){var r=Qt(t),e=n===1?r++:r--;return En(t,r),e}function Ot(t,n){var r=t.reactions;if(r!==null)for(var e=rt(),l=r.length,s=0;s<l;s++){var a=r[s],i=a.f;i&x||!e&&a===o||(A(a,n),i&(v|w)&&(i&T?Ot(a,F):lt(a)))}}let q=!1;function wr(t){q=t}let D;function M(t){if(t===null)throw xt(),Rt;return D=t}function Tr(){return M(P(D))}function mr(t){if(q){if(P(D)!==null)throw xt(),Rt;D=t}}function gr(){for(var t=0,n=D;;){if(n.nodeType===8){var r=n.data;if(r===hn){if(t===0)return n;t-=1}else(r===vn||r===pn)&&(t+=1)}var e=P(n);n.remove(),n=e}}var yt,wn,Ct,Nt;function Ar(){if(yt===void 0){yt=window,wn=/Firefox/.test(navigator.userAgent);var t=Element.prototype,n=Node.prototype;Ct=ht(n,"firstChild").get,Nt=ht(n,"nextSibling").get,t.__click=void 0,t.__className="",t.__attributes=null,t.__styles=null,t.__e=void 0,Text.prototype.__t=void 0}}function st(t=""){return document.createTextNode(t)}function at(t){return Ct.call(t)}function P(t){return Nt.call(t)}function kr(t,n){if(!q)return at(t);var r=at(D);if(r===null)r=D.appendChild(st());else if(n&&r.nodeType!==3){var e=st();return r==null||r.before(e),M(e),e}return M(r),r}function Dr(t,n){if(!q){var r=at(t);return r instanceof Comment&&r.data===""?P(r):r}return D}function Ir(t,n=1,r=!1){let e=q?D:t;for(var l;n--;)l=e,e=P(e);if(!q)return e;var s=e==null?void 0:e.nodeType;if(r&&s!==3){var a=st();return e===null?l==null||l.after(a):e.before(a),M(a),a}return M(e),e}function Rr(t){t.textContent=""}function bt(t){var n=T|x,r=u!==null&&u.f&T?u:null;return o===null||r!==null&&r.f&w?n|=w:o.f|=kt,{ctx:f,deps:null,effects:null,equals:Dt,f:n,fn:t,reactions:null,rv:0,v:null,wv:0,parent:r??o}}function xr(t){const n=bt(t);return n.equals=It,n}function qt(t){var n=t.effects;if(n!==null){t.effects=null;for(var r=0;r<n.length;r+=1)O(n[r])}}function Tn(t){for(var n=t.parent;n!==null;){if(!(n.f&T))return n;n=n.parent}return null}function mn(t){var n,r=o;W(Tn(t));try{qt(t),n=zt(t)}finally{W(r)}return n}function Ft(t){var n=mn(t),r=(R||t.f&w)&&t.deps!==null?F:v;A(t,r),t.equals(n)||(t.v=n,t.wv=$t())}function Pt(t){o===null&&u===null&&on(),u!==null&&u.f&w&&o===null&&un(),ct&&an()}function gn(t,n){var r=n.last;r===null?n.last=n.first=t:(r.next=t,t.prev=r,n.last=t)}function L(t,n,r,e=!0){var l=(t&j)!==0,s=o,a={ctx:f,deps:null,nodes_start:null,nodes_end:null,f:t|x,first:null,fn:n,last:null,next:null,parent:l?null:s,prev:null,teardown:null,transitions:null,wv:0};if(r){var i=C;try{wt(!0),vt(a),a.f|=en}catch(p){throw O(a),p}finally{wt(i)}}else n!==null&&lt(a);var y=r&&a.deps===null&&a.first===null&&a.nodes_start===null&&a.teardown===null&&(a.f&(kt|G))===0;if(!y&&!l&&e&&(s!==null&&gn(a,s),u!==null&&u.f&T)){var _=u;(_.effects??(_.effects=[])).push(a)}return a}function Sr(t){const n=L(Q,null,!1);return A(n,v),n.teardown=t,n}function Or(t){Pt();var n=o!==null&&(o.f&I)!==0&&f!==null&&!f.m;if(n){var r=f;(r.e??(r.e=[])).push({fn:t,effect:o,reaction:u})}else{var e=Lt(t);return e}}function Cr(t){return Pt(),An(t)}function Nr(t){const n=L(j,t,!0);return(r={})=>new Promise(e=>{r.outro?In(n,()=>{O(n),e(void 0)}):(O(n),e(void 0))})}function Lt(t){return L(gt,t,!1)}function An(t){return L(Q,t,!0)}function br(t,n=[],r=bt){const e=n.map(r);return kn(()=>t(...e.map(Qt)))}function kn(t,n=0){return L(Q|it|n,t,!0)}function qr(t,n=!0){return L(Q|I,t,!0,n)}function Mt(t){var n=t.teardown;if(n!==null){const r=ct,e=u;Tt(!0),z(null);try{n.call(null)}finally{Tt(r),z(e)}}}function Yt(t,n=!1){var r=t.first;for(t.first=t.last=null;r!==null;){var e=r.next;O(r,n),r=e}}function Dn(t){for(var n=t.first;n!==null;){var r=n.next;n.f&I||O(n),n=r}}function O(t,n=!0){var r=!1;if((n||t.f&ln)&&t.nodes_start!==null){for(var e=t.nodes_start,l=t.nodes_end;e!==null;){var s=e===l?null:P(e);e.remove(),e=s}r=!0}Yt(t,n&&!r),J(t,0),A(t,tt);var a=t.transitions;if(a!==null)for(const y of a)y.stop();Mt(t);var i=t.parent;i!==null&&i.first!==null&&Ht(t),t.next=t.prev=t.teardown=t.ctx=t.deps=t.fn=t.nodes_start=t.nodes_end=null}function Ht(t){var n=t.parent,r=t.prev,e=t.next;r!==null&&(r.next=e),e!==null&&(e.prev=r),n!==null&&(n.first===t&&(n.first=e),n.last===t&&(n.last=r))}function In(t,n){var r=[];jt(t,r,!0),Rn(r,()=>{O(t),n&&n()})}function Rn(t,n){var r=t.length;if(r>0){var e=()=>--r||n();for(var l of t)l.out(e)}else n()}function jt(t,n,r){if(!(t.f&b)){if(t.f^=b,t.transitions!==null)for(const a of t.transitions)(a.is_global||r)&&n.push(a);for(var e=t.first;e!==null;){var l=e.next,s=(e.f&At)!==0||(e.f&I)!==0;jt(e,n,s?r:!1),e=l}}}function Fr(t){Bt(t,!0)}function Bt(t,n){if(t.f&b){t.f^=b,t.f&v||(t.f^=v),B(t)&&(A(t,x),lt(t));for(var r=t.first;r!==null;){var e=r.next,l=(r.f&At)!==0||(r.f&I)!==0;Bt(r,l?n:!1),r=e}if(t.transitions!==null)for(const s of t.transitions)(s.is_global||n)&&s.in()}}const xn=typeof requestIdleCallback>"u"?t=>setTimeout(t,1):requestIdleCallback;let $=!1,Z=!1,ut=[],ot=[];function Ut(){$=!1;const t=ut.slice();ut=[],mt(t)}function Vt(){Z=!1;const t=ot.slice();ot=[],mt(t)}function Pr(t){$||($=!0,queueMicrotask(Ut)),ut.push(t)}function Lr(t){Z||(Z=!0,xn(Vt)),ot.push(t)}function Sn(){$&&Ut(),Z&&Vt()}const Gt=0,On=1;let U=!1,V=Gt,Y=!1,H=null,C=!1,ct=!1;function wt(t){C=t}function Tt(t){ct=t}let S=[],N=0;let u=null,m=!1;function z(t){u=t}let o=null;function W(t){o=t}let g=null;function Cn(t){g=t}let c=null,E=0,k=null;function Nn(t){k=t}let Kt=1,X=0,R=!1;function $t(){return++Kt}function B(t){var h;var n=t.f;if(n&x)return!0;if(n&F){var r=t.deps,e=(n&w)!==0;if(r!==null){var l,s,a=(n&K)!==0,i=e&&o!==null&&!R,y=r.length;if(a||i){var _=t,p=_.parent;for(l=0;l<y;l++)s=r[l],(a||!((h=s==null?void 0:s.reactions)!=null&&h.includes(_)))&&(s.reactions??(s.reactions=[])).push(_);a&&(_.f^=K),i&&p!==null&&!(p.f&w)&&(_.f^=w)}for(l=0;l<y;l++)if(s=r[l],B(s)&&Ft(s),s.wv>t.wv)return!0}(!e||o!==null&&!R)&&A(t,v)}return!1}function bn(t,n){for(var r=n;r!==null;){if(r.f&G)try{r.fn(t);return}catch{r.f^=G}r=r.parent}throw U=!1,t}function qn(t){return(t.f&tt)===0&&(t.parent===null||(t.parent.f&G)===0)}function et(t,n,r,e){if(U){if(r===null&&(U=!1),qn(n))throw t;return}r!==null&&(U=!0);{bn(t,n);return}}function Zt(t,n,r=!0){var e=t.reactions;if(e!==null)for(var l=0;l<e.length;l++){var s=e[l];s.f&T?Zt(s,n,!1):n===s&&(r?A(s,x):s.f&v&&A(s,F),lt(s))}}function zt(t){var pt;var n=c,r=E,e=k,l=u,s=R,a=g,i=f,y=m,_=t.f;c=null,E=0,k=null,u=_&(I|j)?null:t,R=(_&w)!==0&&(!C||l===null||y),g=null,Et(t.ctx),m=!1,X++;try{var p=(0,t.fn)(),h=t.deps;if(c!==null){var d;if(J(t,E),h!==null&&E>0)for(h.length=E+c.length,d=0;d<c.length;d++)h[E+d]=c[d];else t.deps=h=c;if(!R)for(d=E;d<h.length;d++)((pt=h[d]).reactions??(pt.reactions=[])).push(t)}else h!==null&&E<h.length&&(J(t,E),h.length=E);if(rt()&&k!==null&&!m&&h!==null&&!(t.f&(T|F|x)))for(d=0;d<k.length;d++)Zt(k[d],t);return l!==null&&X++,p}finally{c=n,E=r,k=e,u=l,R=s,g=a,Et(i),m=y}}function Fn(t,n){let r=n.reactions;if(r!==null){var e=tn.call(r,t);if(e!==-1){var l=r.length-1;l===0?r=n.reactions=null:(r[e]=r[l],r.pop())}}r===null&&n.f&T&&(c===null||!c.includes(n))&&(A(n,F),n.f&(w|K)||(n.f^=K),qt(n),J(n,0))}function J(t,n){var r=t.deps;if(r!==null)for(var e=n;e<r.length;e++)Fn(t,r[e])}function vt(t){var n=t.f;if(!(n&tt)){A(t,v);var r=o,e=f;o=t;try{n&it?Dn(t):Yt(t),Mt(t);var l=zt(t);t.teardown=typeof l=="function"?l:null,t.wv=Kt;var s=t.deps,a}catch(i){et(i,t,r,e||t.ctx)}finally{o=r}}}function Wt(){if(N>1e3){N=0;try{fn()}catch(t){if(H!==null)et(t,H,null);else throw t}}N++}function Xt(t){var n=t.length;if(n!==0){Wt();var r=C;C=!0;try{for(var e=0;e<n;e++){var l=t[e];l.f&v||(l.f^=v);var s=Mn(l);Pn(s)}}finally{C=r}}}function Pn(t){var n=t.length;if(n!==0)for(var r=0;r<n;r++){var e=t[r];if(!(e.f&(tt|b)))try{B(e)&&(vt(e),e.deps===null&&e.first===null&&e.nodes_start===null&&(e.teardown===null?Ht(e):e.fn=null))}catch(l){et(l,e,null,e.ctx)}}}function Ln(){if(Y=!1,N>1001)return;const t=S;S=[],Xt(t),Y||(N=0,H=null)}function lt(t){V===Gt&&(Y||(Y=!0,queueMicrotask(Ln))),H=t;for(var n=t;n.parent!==null;){n=n.parent;var r=n.f;if(r&(j|I)){if(!(r&v))return;n.f^=v}}S.push(n)}function Mn(t){var n=[],r=t.first;t:for(;r!==null;){var e=r.f,l=(e&I)!==0,s=l&&(e&v)!==0,a=r.next;if(!s&&!(e&b)){if(e&gt)n.push(r);else if(l)r.f^=v;else{var i=u;try{u=r,B(r)&&vt(r)}catch(p){et(p,r,null,r.ctx)}finally{u=i}}var y=r.first;if(y!==null){r=y;continue}}if(a===null){let p=r.parent;for(;p!==null;){if(t===p)break t;var _=p.next;if(_!==null){r=_;continue t}p=p.parent}}r=a}return n}function Jt(t){var n=V,r=S;try{Wt();const l=[];V=On,S=l,Y=!1,Xt(r);var e=t==null?void 0:t();return Sn(),(S.length>0||l.length>0)&&Jt(),N=0,H=null,e}finally{V=n,S=r}}async function Mr(){await Promise.resolve(),Jt()}function Qt(t){var n=t.f,r=(n&T)!==0;if(u!==null&&!m){g!==null&&g.includes(t)&&_n();var e=u.deps;t.rv<X&&(t.rv=X,c===null&&e!==null&&e[E]===t?E++:c===null?c=[t]:(!R||!c.includes(t))&&c.push(t))}else if(r&&t.deps===null&&t.effects===null){var l=t,s=l.parent;s!==null&&!(s.f&w)&&(l.f^=w)}return r&&(l=t,B(l)&&Ft(l)),t.v}function Yr(t){var n=m;try{return m=!0,t()}finally{m=n}}const Yn=-7169;function A(t,n){t.f=t.f&Yn|n}function Hr(t){if(!(typeof t!="object"||!t||t instanceof EventTarget)){if(dt in t)ft(t);else if(!Array.isArray(t))for(let n in t){const r=t[n];typeof r=="object"&&r&&dt in r&&ft(r)}}}function ft(t,n=new Set){if(typeof t=="object"&&t!==null&&!(t instanceof EventTarget)&&!n.has(t)){n.add(t),t instanceof Date&&t.getTime();for(let e in t)try{ft(t[e],n)}catch{}const r=rn(t);if(r!==Object.prototype&&r!==Array.prototype&&r!==Map.prototype&&r!==Set.prototype&&r!==Date.prototype){const e=nn(r);for(let l in e){const s=e[l].get;if(s)try{s.call(t)}catch{}}}}}export{dn as $,_t as A,Qn as B,En as C,ht as D,At as E,o as F,Jn as G,rn as H,Hn as I,Tr as J,pn as K,gr as L,M,wr as N,Fr as O,In as P,Xn as Q,$n as R,dt as S,xr as T,vr as U,or as V,It as W,fr as X,Zn as Y,ur as Z,ar as _,Or as a,ir as a0,st as a1,at as a2,wn as a3,_r as a4,cr as a5,z as a6,W as a7,u as a8,Sr as a9,Lr as aA,zn as aB,rt as aC,Er as aD,yr as aE,sn as aF,Pr as aa,Bn as ab,Ar as ac,vn as ad,P as ae,Rt as af,hn as ag,xt as ah,Wn as ai,Rr as aj,jn as ak,Nr as al,Lt as am,An as an,Jt as ao,dr as ap,Mr as aq,er as ar,b as as,nr as at,yn as au,rr as av,lr as aw,jt as ax,Rn as ay,sr as az,Yr as b,f as c,Kn as d,Hr as e,bt as f,Qt as g,tr as h,kn as i,qr as j,O as k,nt as l,q as m,Gn as n,D as o,Dr as p,pr as q,mt as r,hr as s,br as t,Cr as u,kr as v,mr as w,Ir as x,Un as y,Vn as z};
