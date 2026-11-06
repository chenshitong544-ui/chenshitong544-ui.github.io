import type {Entry} from './studio-data';
export function isBuiltin(p?:Entry){return !!p&&p.id==='p1'&&p.sample===true&&p.template==='blouse'&&p.category==='娃衣'&&p.version==='v0.1'&&p.size==='混合天使 · 中胸'&&!p.file&&!p.image;}
export function hasPaper(p?:Entry){return !!p&&(!!p.file||!!p.image||isBuiltin(p));}
export function paperInfo(p?:Entry){return {available:hasPaper(p),scale:p?.printScale||(isBuiltin(p)?'100% 实际大小':'待核对'),seam:p?.seam||(isBuiltin(p)?'原版已含缝份':'待核对'),size:p?.size||'尺寸未填写'};}
export type Step={label:string;title:string;detail:string;check:string};
export function stepsFor(p?:Entry):Step[]{
if(p?.template==='skirt')return [
{label:'纸样与腰围',title:'先核对腰围、裙长与穿脱方式',detail:'确认纸样适用娃体、打印比例与缝份。没有纸样时，先建立计划并补齐资料。',check:'纸样、腰围与裙长已核对'},
{label:'排料与裁剪',title:'辨认裙身、腰头与开口位置',detail:'按该纸样的布纹与裁剪数量排料，保留对位点；裁剪前检查松量与开口。',check:'裁片与对位标记已准备'},
{label:'裙身与腰口',title:'按纸样说明处理裙身和腰口',detail:'按当前款式完成侧缝、抽褶或腰头，最后处理开口和下摆。具体先后以该纸样说明为准。',check:'裙身、腰口与下摆已完成'},
{label:'试穿与调整',title:'检查穿脱、腰口与裙长',detail:'给娃试穿，记录腰口是否合适、开口是否足够，修改后保留新版纸样。',check:'试穿问题已记录'},
{label:'成品归档',title:'拍照，留下这次制作的记录',detail:'保存成品实拍、使用的面料和改版笔记，然后归档到我的作品。',check:'成品照片与记录已准备'}];
if(p?.category==='包袋')return [
{label:'纸样与尺寸',title:'确认袋身尺寸、结构与裁片',detail:'核对宽、高、底厚和提手尺寸；检查是否包含里布、衬料及缝份。款式示意不能直接当作裁剪纸样。',check:'袋身尺寸、纸样比例与缝份已核对'},
{label:'备料与裁剪',title:'准备主布、里布、提手和辅料',detail:'按当前纸样的裁剪清单准备材料。记录主布与里布用量，检查布纹、方向及提手裁剪数量。',check:'材料与裁片已准备'},
{label:'袋身与提手',title:'按款式说明缝合袋身与提手',detail:'先查看这份纸样的工艺顺序，再处理袋身、包底、口袋和提手；无里布款可跳过里布工序。',check:'袋身、包底和提手已检查'},
{label:'袋口与检查',title:'完成袋口并检查使用效果',detail:'按该款式处理袋口、里布（如有）和返口。检查提手连接、开合方式、尺寸及承重部位的缝线。',check:'袋口与关键缝线已检查'},
{label:'成品归档',title:'记录成品尺寸和制作经验',detail:'添加完成照片、使用的材料和这次修改的地方，再归档为自己的作品。',check:'成品照片与记录已准备'}];
if(p?.category==='娃衣')return [
{label:'纸样与娃体',title:'核对适用娃体、衣长与开口',detail:'确认当前纸样适配的胸围、腰围等实测尺寸，并核对打印比例与缝份。先用试样布检查版型。',check:'纸样、娃体尺寸与缝份已核对'},
{label:'裁剪与衣身',title:'认清每片裁片，再缝合衣身',detail:'按这份纸样的布纹与裁剪数量准备裁片，标记省道和对位点。缝合后先检查衣身。',check:'裁片和衣身已检查'},
{label:'局部与开口',title:'按款式处理袖、领与开口',detail:'仅处理这件款式实际具有的结构。按纸样说明安装袖领、处理挂面、扣合或后开口。',check:'本款局部结构已完成'},
{label:'试穿与改版',title:'给娃试穿，记录具体问题',detail:'检查肩线、胸口、腰围和穿脱空间。一次调整一处，修改后记录并保留旧版。',check:'试穿问题与修改已记录'},
{label:'成品归档',title:'拍下你的第一件成品',detail:'添加实拍、面料与修改记录，保留可再次使用的纸样版本。',check:'成品照片与记录已准备'}];
return [
{label:'纸样与尺寸',title:'先明确这件作品的结构和尺寸',detail:'选择当前项目对应的纸样，核对成品尺寸、打印比例和缝份。',check:'纸样与尺寸已核对'},
{label:'材料与裁剪',title:'按裁剪清单准备布料和辅料',detail:'确认主布、里布（如有）与辅料，保留裁片名称和对位点。',check:'材料与裁片已准备'},
{label:'缝制与组装',title:'跟随这份纸样的制作说明',detail:'以当前款式的工艺顺序为准，完成主体缝合和局部结构。',check:'主体与局部结构已完成'},
{label:'检查与调整',title:'检查尺寸、开口和使用效果',detail:'记录使用或试穿中发现的问题，必要时修改纸样并保存新版。',check:'使用问题已记录'},
{label:'成品归档',title:'把完成的作品和过程一起留下',detail:'添加成品照片、用料和笔记，再归档到我的作品。',check:'成品照片与记录已准备'}];}
