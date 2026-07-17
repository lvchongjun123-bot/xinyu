<template>
  <div class="pc-root">
    <div class="pc-top">
      <button class="btn btn-ghost" @click="$emit('back')">← 返回</button>
      <h2>个人中心</h2>
      <span class="pc-mode" :class="auth.mode">{{ auth.isMySQLMode ? '☁️ 云端' : '💻 本地' }}</span>
    </div>

    <div class="pc-grid">
      <!-- Avatar + Name -->
      <div class="pc-card">
        <div class="pc-avatar-row">
          <div class="pc-avatar" @click="showEditor=!showEditor">
            <img v-if="avatarPreview" :src="avatarPreview" alt="" />
            <span v-else>😊</span>
            <div class="pc-avatar-edit">换</div>
          </div>
          <div class="pc-name-area">
            <template v-if="editingName">
              <input ref="nameInput" v-model="editNameValue" maxlength="20" class="pc-name-inp"
                @keydown.enter="saveName" @keydown.escape="editingName=false" @blur="saveName" />
            </template>
            <template v-else>
              <span class="pc-name" @click="startEditName">{{ auth.user?.username || '未设置' }}</span>
              <button class="pc-edit" @click="startEditName">✏️</button>
            </template>
          </div>
        </div>
        <div class="pc-meta" v-if="auth.user?.createdAt">注册于 {{ formatDate(auth.user.createdAt) }}</div>

        <!-- Editor -->
        <div v-if="showEditor" class="pc-editor">
          <div class="pc-editor-tabs">
            <button :class="{on:editorTab==='emoji'}" @click="editorTab='emoji'">Emoji</button>
            <button :class="{on:editorTab==='upload'}" @click="editorTab='upload'">上传</button>
          </div>
          <div v-if="editorTab==='emoji'" class="pc-emoji-grid">
            <button v-for="e in emojiList" :key="e" :class="{sel:avatarPreview===e}" @click="selectEmoji(e)">{{ e }}</button>
          </div>
          <div v-else class="pc-upload">
            <label class="pc-upload-zone">
              <input type="file" accept="image/*" hidden @change="handleFile" />
              <span>📁 点击选择</span><span class="pc-upload-hint">≤2MB</span>
            </label>
            <button v-if="uploadPreview" class="btn btn-primary btn-sm" style="margin-top:8px" @click="confirmUpload">使用</button>
            <img v-if="uploadPreview" :src="uploadPreview" class="pc-upload-prev" />
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="pc-card">
        <h3 class="pc-ctitle">📊 学习概览</h3>
        <div class="pc-stats">
          <div class="pc-stat"><b>{{ stats?.learned || 0 }}</b><span>已学单词</span></div>
          <div class="pc-stat"><b>{{ stats?.streak || 0 }}🔥</b><span>连续天数</span></div>
          <div class="pc-stat"><b>{{ stats?.percent || 0 }}%</b><span>词库进度</span></div>
          <div class="pc-stat"><b>{{ stats?.dailyQuota || 20 }}</b><span>每日配额</span></div>
        </div>
      </div>

      <!-- Notify -->
      <div class="pc-card" v-if="supportsNotification">
        <h3 class="pc-ctitle">🔔 提醒</h3>
        <div class="pc-row">
          <span>每日 20:00 复习提醒</span>
          <button v-if="notifyEnabled" class="btn btn-outline btn-sm" @click="disableNotify">已开启</button>
          <button v-else class="btn btn-primary btn-sm" @click="enableNotify">开启</button>
        </div>
      </div>

      <!-- Export -->
      <div class="pc-card">
        <h3 class="pc-ctitle">📤 数据</h3>
        <div class="pc-row">
          <button class="btn btn-outline btn-sm" @click="exportCSV">导出 CSV</button>
          <button class="btn btn-outline btn-sm" @click="exportJSON">导出 JSON</button>
        </div>
      </div>

      <!-- Logout -->
      <button class="pc-logout" @click="confirmLogout=true">退出登录</button>
    </div>

    <!-- Modal -->
    <div v-if="confirmLogout" class="pc-overlay" @click.self="confirmLogout=false">
      <div class="pc-modal">
        <h3>退出登录</h3><p style="color:var(--muted);margin:8px 0 16px;font-size:13px">数据保留在{{ auth.isMySQLMode ? '云端' : '本地' }}</p>
        <div style="display:flex;gap:8px;justify-content:center"><button class="btn btn-ghost" @click="confirmLogout=false">取消</button><button class="btn" style="background:var(--destructive);color:var(--destructive-foreground)" @click="doLogout">退出</button></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth.js'
const props = defineProps({ stats:{type:Object,default:()=>({learned:0,streak:0,percent:0,dailyQuota:20})} })
const emit = defineEmits(['back','logout'])
const auth = useAuthStore()
const supportsNotification = computed(()=>typeof window!=='undefined'&&'Notification' in window)
const notifyEnabled = ref(false)
try{const s=JSON.parse(localStorage.getItem('ev_notify'));notifyEnabled.value=s?.scheduled||false}catch(e){}
async function enableNotify(){if(!('Notification' in window)){window._showToast('不支持通知');return}const r=await Notification.requestPermission();if(r==='granted'){notifyEnabled.value=true;localStorage.setItem('ev_notify',JSON.stringify({scheduled:true}));const t=setInterval(()=>{const n=new Date();if(n.getHours()===20&&n.getMinutes()===0)new Notification('📚 别忘了复习！',{body:'每天坚持几分钟',icon:'/xinyu/icon.svg'})},6e4);window._notifyTimer=t;new Notification('✅ 已开启',{body:'每天20:00提醒',icon:'/xinyu/icon.svg'})}else window._showToast('需允许通知')}
function disableNotify(){notifyEnabled.value=false;localStorage.setItem('ev_notify',JSON.stringify({scheduled:false}));if(window._notifyTimer){clearInterval(window._notifyTimer);window._notifyTimer=null}}
function getStudyData(){const uid=auth.user?.id;if(!uid)return[];const pk=`ev_study_plan_${uid}`,mp=`ev_mastered_v2_${uid}_`,r=[];try{const pd=JSON.parse(localStorage.getItem(pk)||'{}');for(const[bid,bd]of Object.entries(pd)){const mk=`${mp}${bid}`,md=localStorage.getItem(mk)?JSON.parse(localStorage.getItem(mk)):{};for(const[wid,rc]of Object.entries(bd.words||{})){if(md[wid])r.push({bookId:bid,wordId:Number(wid),firstLearned:rc.firstLearned||'',lastReviewed:rc.lastReviewed||'',reviewCount:rc.reviewCount||0})}}}catch(e){}return r}
function exportCSV(){const d=getStudyData();if(!d.length){window._showToast('无数据');return}const c=['bookId,wordId,firstLearned,lastReviewed,reviewCount',...d.map(x=>`${x.bookId},${x.wordId},${x.firstLearned},${x.lastReviewed},${x.reviewCount}`)].join('\n');download(`vocab-${new Date().toISOString().slice(0,10)}.csv`,c,'text/csv')}
function exportJSON(){const d=getStudyData();if(!d.length){window._showToast('无数据');return}download(`vocab-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(d,null,2),'application/json')}
function download(f,c,m){const b=new Blob([c],{type:m}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=f;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(u)}
const emojiList=['😊','😎','🤓','🧑‍🎓','🦊','🐱','🐶','🐼','🦁','🐸','🦄','🐙','🌟','🔥','💡','🎯','🚀','🌈','🍀','🌻','🎸','📚','💻','⚡']
const showEditor=ref(false),editorTab=ref('emoji'),avatarPreview=ref(auth.user?.avatar||''),uploadPreview=ref(null)
watch(()=>auth.user?.avatar,v=>{avatarPreview.value=v||''})
function selectEmoji(e){avatarPreview.value=e;uploadPreview.value=null;auth.updateProfile({avatar:e});showEditor.value=false}
function handleFile(e){const f=e.target.files?.[0];if(!f)return;if(f.size>2*1024*1024){auth.error='≤2MB';return}const r=new FileReader();r.onload=ev=>{const i=new Image();i.onload=()=>{const c=document.createElement('canvas');c.width=200;c.height=200;const x=c.getContext('2d'),s=Math.min(i.width,i.height);x.drawImage(i,(i.width-s)/2,(i.height-s)/2,s,s,0,0,200,200);uploadPreview.value=c.toDataURL('image/png',0.8)};i.src=ev.target.result};r.readAsDataURL(f)}
async function confirmUpload(){if(!uploadPreview.value)return;avatarPreview.value=uploadPreview.value;await auth.updateProfile({avatar:uploadPreview.value});uploadPreview.value=null;showEditor.value=false}
const editingName=ref(false),editNameValue=ref(''),nameInput=ref(null)
function startEditName(){editNameValue.value=auth.user?.username||'';editingName.value=true;nextTick(()=>nameInput.value?.focus())}
async function saveName(){if(!editingName.value)return;editingName.value=false;const n=editNameValue.value.trim();if(!n||n===auth.user?.username)return;if(n.length<2){auth.error='至少2字符';return};await auth.updateProfile({username:n})}
const confirmLogout=ref(false)
function doLogout(){confirmLogout.value=false;auth.logout();emit('logout')}
function formatDate(i){if(!i)return'-';const d=new Date(i);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
</script>

<style scoped>
.pc-root{max-width:720px;margin:0 auto;width:100%}
.pc-top{display:flex;align-items:center;gap:var(--space-md);margin-bottom:20px}
.pc-top h2{font-size:var(--text-xl);font-weight:var(--font-bold);color:var(--foreground)}
.pc-mode{font-size:var(--text-xs);padding:2px var(--space-sm);border-radius:10px;font-weight:var(--font-semibold);background:var(--primary-subtle);color:var(--primary)}
.pc-grid{display:flex;flex-direction:column;gap:var(--space-md)}

.pc-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px}
.pc-ctitle{font-size:13px;font-weight:var(--font-bold);color:var(--foreground);margin-bottom:14px}

/* Avatar */
.pc-avatar-row{display:flex;align-items:center;gap:14px;margin-bottom:var(--space-sm)}
.pc-avatar{width:56px;height:56px;border-radius:50%;background:var(--primary-subtle);display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;position:relative;overflow:hidden;flex-shrink:0}
.pc-avatar img{width:100%;height:100%;object-fit:cover}
.pc-avatar-edit{position:absolute;inset:0;background:var(--overlay);color:#fff;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);opacity:0;transition:opacity .15s;border-radius:50%}
.pc-avatar:hover .pc-avatar-edit{opacity:1}
.pc-name-area{display:flex;align-items:center;gap:6px}
.pc-name{font-size:var(--text-lg);font-weight:var(--font-semibold);color:var(--foreground);cursor:pointer}
.pc-name-inp{padding:3px var(--space-sm);font-size:var(--text-base);width:120px}
.pc-edit{border:none;background:none;cursor:pointer;font-size:var(--text-sm);opacity:.4}.pc-edit:hover{opacity:1}
.pc-meta{font-size:var(--text-xs);color:var(--muted-foreground);margin-bottom:var(--space-sm)}

/* Editor */
.pc-editor{margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--border)}
.pc-editor-tabs{display:flex;gap:2px;background:var(--input);border-radius:var(--radius-sm);padding:2px;margin-bottom:10px;width:fit-content}
.pc-editor-tabs button{padding:5px 14px;border:none;background:none;border-radius:var(--radius-sm);font-size:var(--text-sm);font-family:inherit;cursor:pointer;color:var(--muted);transition:all .1s}
.pc-editor-tabs button.on{background:var(--card);color:var(--foreground);font-weight:var(--font-semibold);box-shadow:var(--shadow-sm)}
.pc-emoji-grid{display:grid;grid-template-columns:repeat(auto-fill, minmax(40px, 1fr));gap:var(--space-xs)}
.pc-emoji-grid button{aspect-ratio:1;border:2px solid transparent;border-radius:var(--radius-sm);background:var(--card-hover);cursor:pointer;font-size:18px;transition:all .1s}
.pc-emoji-grid button:hover{border-color:var(--primary)}
.pc-emoji-grid button.sel{border-color:var(--primary);background:var(--primary-subtle)}
.pc-upload-zone{display:flex;flex-direction:column;align-items:center;gap:var(--space-xs);padding:20px;border:2px dashed var(--border);border-radius:var(--radius-sm);cursor:pointer;color:var(--muted);transition:all .15s;font-size:13px}
.pc-upload-zone:hover{border-color:var(--primary);color:var(--primary)}
.pc-upload-hint{font-size:10px;color:var(--muted-foreground)}
.pc-upload-prev{width:80px;height:80px;border-radius:var(--radius-sm);margin-top:var(--space-sm);border:2px solid var(--border);object-fit:cover}

/* Stats */
.pc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-sm)}
.pc-stat{text-align:center;padding:14px var(--space-sm);background:var(--card);border:1px solid var(--border);border-radius:var(--radius-sm);transition:all var(--transition-fast)}
.pc-stat:hover{transform:translateY(-1px);box-shadow:var(--shadow-sm)}
.pc-stat b{display:block;font-size:var(--text-2xl);font-weight:var(--font-extrabold);color:var(--primary)}
.pc-stat span{display:block;font-size:var(--text-xs);color:var(--muted);margin-top:var(--space-xs)}

/* Rows */
.pc-row{display:flex;align-items:center;justify-content:space-between;gap:var(--space-md);font-size:13px;color:var(--foreground)}

/* Logout */
.pc-logout{width:100%;padding:10px;border:1px solid var(--destructive);border-radius:var(--radius-sm);background:transparent;color:var(--destructive);font-size:13px;font-family:inherit;cursor:pointer;transition:all .15s}
.pc-logout:hover{background:var(--destructive-subtle)}

/* Modal */
.pc-overlay{position:fixed;inset:0;background:var(--overlay);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:var(--z-overlay)}
.pc-modal{background:var(--card);border:1px solid var(--border);border-radius:var(--radius-md);padding:28px;max-width:380px;width:92%;text-align:center;box-shadow:var(--shadow-lg)}
.pc-modal h3{font-size:var(--text-lg);margin-bottom:var(--space-xs)}
</style>