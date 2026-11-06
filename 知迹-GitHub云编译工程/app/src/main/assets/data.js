(function () {
  "use strict";

  const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120];
  const leaf = (id, title, question, answer, explanation, tip) => ({
    id,
    title,
    example: { question, answer, explanation },
    tip
  });
  const mod = (id, title, overview, leafs) => ({ id, title, overview, leafs });

  const subjects = [
    {
      id: "chinese",
      name: "语文",
      mark: "语",
      color: "#ef8354",
      tint: "#fff1eb",
      description: "新高考语文：信息类、文学类、文言文、诗歌、语用与写作",
      modules: [
        mod("cn-info", "信息类阅读Ⅰ", "训练筛选、整合、论证和迁移能力。", [
          leaf("cn-info-1", "概念筛选与信息比对", "材料说“城市更新应保留生活网络”，哪项最符合原意？", "保留原有社区交往与日常服务，而不只保存老建筑。", "先定位“生活网络”，再区分建筑实体与人的活动；选项若把二者等同，就是偷换概念。", "圈出限制词：只、都、主要、根本、已经。"),
          leaf("cn-info-2", "论证方法识别", "作者引用统计数据证明观点，主要使用了什么论证方法？", "举例论证或数据论证。", "论据用来支撑论点。数据使结论更具体，但仍需检查样本、口径和是否足以推出一般结论。", "回答“方法＋作用＋证明了什么”。"),
          leaf("cn-info-3", "论证结构与思路", "概括材料的论证脉络。", "先提出问题，再分析原因，最后提出解决路径。", "用“提出—分析—解决”“总—分—总”等结构词概括，同时指出每一部分的核心内容。", "不要只写段落大意，要写段落之间的逻辑关系。"),
          leaf("cn-info-4", "观点评价与迁移", "结合材料评价“技术越先进，教育越有效”这一说法。", "观点片面：技术只是条件，教学设计、师生互动和学习反馈决定效果。", "评价题先明确立场，再分别说明合理处与局限，最后用材料依据和自己的分析收束。", "先限定概念，再谈条件，避免绝对化。")
        ]),
        mod("cn-literature", "文学类阅读Ⅱ", "从人物、情节、环境和语言把握小说散文的深层含义。", [
          leaf("cn-lit-1", "人物形象分析", "小说中主人公反复帮助陌生人，说明他是什么样的人？", "善良、有责任感，同时在帮助他人中寻求自我价值。", "人物形象要从言行、心理、他人评价和情节变化中概括；既写性格词，也写文本依据。", "至少答出“特征＋依据＋作用”三层。"),
          leaf("cn-lit-2", "情节作用分析", "开头写暴雨封锁山路，有什么作用？", "交代环境、制造紧张氛围、推动人物滞留并引出冲突。", "情节作用可从环境、人物、结构、主题四个方向组织；优先回答与本题情节最直接的联系。", "开头常见“设置悬念、铺垫、引出下文”。"),
          leaf("cn-lit-3", "环境描写作用", "文中多次写破旧的钟表，有何作用？", "暗示时代与家庭困境，烘托人物心理，并形成贯穿全文的意象。", "先看环境本身的特点，再看它对人物、情节和主题的服务关系，避免只写“渲染气氛”。", "重复出现的物象通常具有线索或象征功能。"),
          leaf("cn-lit-4", "标题与主题", "标题“灯还亮着”有哪些含义？", "表层指真实的灯，深层象征母亲的等待、家庭的希望和人物未熄灭的信念。", "标题题按字面义、语境义、象征义、结构作用分层作答；主题要回到文本证据。", "标题若含意象，务必答双关或象征。")
        ]),
        mod("cn-classical", "文言文阅读", "覆盖实词、虚词、断句和翻译。", [
          leaf("cn-cls-1", "文言实词推断", "解释“因遗策”中“因”的含义。", "沿袭、继承。", "结合搭配和上下文推断。“因遗策”是动宾关系，不能机械套用现代“因为”。", "先看语法位置，再看语境与词性。"),
          leaf("cn-cls-2", "文言虚词辨析", "比较两个“而”的用法。", "一个表转折，一个表修饰；须结合前后动作关系判断。", "虚词判断看连接对象：转折看语义相反，修饰看前者是否描写后一动作的方式。", "把句子翻译通顺，再回推虚词关系。"),
          leaf("cn-cls-3", "文言断句", "为“君 子 之 学 也 入 乎 耳 箸 乎 心”断句。", "君子之学也／入乎耳／箸乎心。", "利用“也”后的停顿、对偶结构和介宾短语切分；先找主谓，再找并列。", "断句优先寻找结构对称和固定句式。"),
          leaf("cn-cls-4", "文言翻译与概括", "翻译“见贤而不能举，见不善而不能退”。", "看见贤才却不能举荐，看见不好的人却不能斥退。", "落实“贤、举、善、退”等关键词，补出主语，调整宾语位置，保持句意完整。", "翻译按“留、删、换、调、补”检查一遍。")
        ]),
        mod("cn-poetry", "古代诗歌阅读", "从意象、情感、手法与语言细节读懂诗歌。", [
          leaf("cn-poem-1", "意象与意境", "“孤舟”“寒江”“暮雪”构成怎样的意境？", "清冷、孤寂、苍茫，寄寓诗人漂泊无依和坚守自我的心境。", "先概括画面，再提炼氛围词，最后联系情感。景物词不能只翻译成白话。", "意境答题公式：描绘画面＋氛围＋情感。"),
          leaf("cn-poem-2", "诗歌情感变化", "分析诗人由喜到悲的情感变化。", "先因景生喜，后由物是人非转为悲伤；乐景反衬哀情。", "按诗句顺序找情感触发点，用“起初—继而—最终”组织变化，并引用关键意象。", "注意转折词和结尾句，诗歌情感常在末句收束。"),
          leaf("cn-poem-3", "表现手法赏析", "诗句借燕子仍归旧巢写人事变迁，用了什么手法？", "对比和拟人；以燕子的不变反衬人事全非。", "先识别手法，再说明文本如何体现，最后写表达效果和情感，三步缺一不可。", "手法不要只写名称，要写“如何写＋写出什么”。"),
          leaf("cn-poem-4", "炼字与比较鉴赏", "比较“鸟宿池边树”与“鸟鸣池边树”的表达效果。", "“宿”写出夜深静寂和归巢状态；“鸣”更突出声音，静中有动。", "比较题从词义、画面、感官、动态和情感五个角度找差异，再判断哪个更契合全诗氛围。", "先分别说明，再给出比较结论。")
        ]),
        mod("cn-dictation", "名篇名句默写", "按情境提取句子，重点解决错字和混淆。", [
          leaf("cn-dic-1", "情境定位", "表达“在困境中仍保持高洁志向”的句子。", "示例：出淤泥而不染，濯清涟而不妖。", "先判断主题，再回想对应篇目；写完后逐字检查同音字、形近字和通假字。", "默写题先调取篇目，再核对题干限制。"),
          leaf("cn-dic-2", "形近字辨误", "“锲而不舍，金石可镂”最容易错哪个字？", "“锲”和“镂”都容易误写；应为金字旁。", "把高频易错句抄成“句中空字”卡片，用遮字回忆而不是整句机械重复。", "错字只抄正确字形，并标记差异部件。"),
          leaf("cn-dic-3", "通假与古今异义", "“师者，所以传道受业解惑也”中哪个字是通假字？", "“受”同“授”，传授。", "默写和解释时辨明通假关系；不要因现代常用义而改写原句。", "建立通假字一对一小卡片，结合原句记忆。"),
          leaf("cn-dic-4", "上下句衔接", "给定上句，准确写出下句。", "先确认篇目和句间逻辑，再按节奏分块回忆。", "长句分成 2—3 个语义块，背诵时同时回忆结构关系和关键字，避免只靠声音顺口。", "用首字提示和结构提示做主动回忆。")
        ]),
        mod("cn-language", "语言文字运用", "成语、病句、衔接补写和修辞得体。", [
          leaf("cn-lang-1", "成语语境辨析", "“面对突发问题，他胸有成竹地立刻制定方案”是否恰当？", "不恰当。“胸有成竹”侧重事前已有把握，与突然发生、临时应对有冲突。", "成语要同时检查对象、褒贬、语法功能和语义侧重点，不能只看字面。", "把易错成语绑定一个具体场景。"),
          leaf("cn-lang-2", "病句辨析与修改", "“通过这次活动，使我明白了合作的重要性”有何语病？", "成分残缺。“通过……使……”使句子缺少主语。", "删去“通过”或“使”，保留一个主语。病句检查从搭配、残缺、赘余、语序和逻辑入手。", "先划分主谓宾，再查修饰语。"),
          leaf("cn-lang-3", "语句衔接与补写", "在说明“阅读需要主动提问”的段落后补写总结句。", "示例：只有带着问题阅读，信息才会转化为真正的理解。", "补写要看前后话题、句式和逻辑关系；结尾句常承担总结、升华或提出条件的作用。", "先判断句子功能，再模仿上下文句式。"),
          leaf("cn-lang-4", "修辞与语言得体", "把“图书馆很安静”改为更生动的表达。", "示例：翻页声落下，像一枚针轻轻触地；整座图书馆屏住了呼吸。", "修辞要服务语境；拟人和比喻都应从图书馆安静、专注的特点出发，避免堆砌辞藻。", "改写后检查是否改变原意、是否过度夸张。")
        ]),
        mod("cn-writing", "写作", "从审题立意到论证与语言表达。", [
          leaf("cn-write-1", "材料审题与概念界定", "材料围绕“快与慢”展开，如何确定中心论点？", "示例：真正的效率不是一味求快，而是在关键处慢下来形成判断。", "先提取材料争议，再界定“快”“慢”的语境，最后提出有条件的中心论点，避免二元对立。", "审题三问：争论什么、限制什么、我能主张什么。"),
          leaf("cn-write-2", "结构与分论点", "为“在变化中守住根基”设计三个分论点。", "示例：守根基需要清醒判断；需要持续积累；需要开放更新。", "分论点共同服务中心论点，彼此不要同义重复；可用“是什么—为什么—怎么做”或并列价值展开。", "每个分论点都应能独立成段并有论据。"),
          leaf("cn-write-3", "论据选取与分析", "如何让“袁隆平研究杂交水稻”的素材更有说服力？", "聚焦长期试验、失败与坚持，分析其如何证明“扎根实践才能创新”。", "素材不要只叙事；要概括关键事实，再解释它与分论点之间的因果或价值关系。", "一段一例也可，但例后必须完成分析闭环。"),
          leaf("cn-write-4", "论证语言与升格", "把“我们要努力学习”改为更有层次的论证句。", "示例：努力学习不是延长机械重复的时间，而是用目标、反馈和复盘不断提高认知质量。", "通过界定概念、设置条件、对比错误做法，使口号变成可论证的判断。", "少用绝对化口号，多用限制词和因果关系。")
        ])
      ]
    },
    {
      id: "math",
      name: "数学",
      mark: "数",
      color: "#3f7cac",
      tint: "#edf5fc",
      description: "新高考数学：函数、导数、三角、数列、立体几何、解析几何、概率统计",
      modules: [
        mod("ma-set", "集合与逻辑", "集合运算、充要条件与量词。", [
          leaf("ma-set-1", "集合交并补", "A={1,2,3}，B={2,3,4}，求 A∩B 与 A∪B。", "A∩B={2,3}，A∪B={1,2,3,4}。", "交集保留公共元素，并集合并全部元素且去重；数轴问题先画区间再运算。", "端点是集合题最常见的失分点。"),
          leaf("ma-set-2", "充分必要条件", "“x>2”是“x²>4”的什么条件？", "充分不必要条件。", "由 x>2 能推出 x²>4；反之 x=-3 也满足 x²>4 但不满足 x>2，所以不是必要。", "判断“p 能否推出 q”和“q 能否推出 p”两个方向。"),
          leaf("ma-set-3", "全称与存在量词", "写出“所有实数 x 都满足 x²≥0”的否定。", "存在实数 x，使 x²<0。", "全称命题的否定是存在命题，同时否定结论；量词和结论要一起变。", "“所有”的否定是“存在一个”。"),
          leaf("ma-set-4", "复数运算", "计算 (1+2i)(3-i)。", "5+5i。", "逐项相乘并用 i²=-1：3-i+6i-2i²=3+5i+2=5+5i。", "复数除法要乘以共轭复数进行分母实数化。")
        ]),
        mod("ma-function", "函数基础", "定义域、性质、指数对数与零点。", [
          leaf("ma-fun-1", "函数定义域", "求 f(x)=√(x-1)/(x-3) 的定义域。", "[1,3)∪(3,+∞)。", "偶次根号内非负，分母不为零，因此 x≥1 且 x≠3。", "先分别列限制，再取交集。"),
          leaf("ma-fun-2", "单调性与奇偶性", "判断 f(x)=x³+x 的奇偶性和单调性。", "奇函数，在 R 上单调递增。", "f(-x)=-f(x)，所以为奇函数；任取 x₁<x₂ 可证 f(x₁)-f(x₂)<0。", "奇偶性先看定义域是否关于原点对称。"),
          leaf("ma-fun-3", "指数与对数", "解方程 log₂(x-1)=3。", "x=9。", "将对数式化为指数式：x-1=2³=8，所以 x=9，并检查真数为正。", "解对数方程后必须检验定义域。"),
          leaf("ma-fun-4", "函数零点", "判断 f(x)=x²-2x-3 的零点。", "x=-1 或 x=3。", "因式分解为 (x-3)(x+1)=0。零点问题也可转化为两函数图像交点。", "零点是与 x 轴交点的横坐标，不是点坐标。")
        ]),
        mod("ma-derivative", "导数及其应用", "切线、单调性、极值与不等式。", [
          leaf("ma-der-1", "导数几何意义", "求 y=x² 在 x=1 处的切线方程。", "y=2x-1。", "f'(x)=2x，斜率 f'(1)=2，切点为 (1,1)，由点斜式 y-1=2(x-1)。", "切线题先求斜率，再确认切点。"),
          leaf("ma-der-2", "单调区间", "求 f(x)=x³-3x 的单调区间。", "增区间 (-∞,-1)、(1,+∞)，减区间 (-1,1)。", "f'(x)=3(x²-1)，根据导数为正或负划分区间，注意区间通常写成开区间。", "导数符号表是避免漏区间的最好方法。"),
          leaf("ma-der-3", "极值与最值", "求 f(x)=x³-3x 的极值。", "x=-1 处极大值 2，x=1 处极小值 -2。", "令 f'(x)=0 得驻点，再检查两侧导数符号变化；闭区间最值还要比较端点。", "驻点不一定极值，极值不一定最值。"),
          leaf("ma-der-4", "构造函数与不等式", "证明当 x>0 时，ln x≤x-1。", "设 g(x)=x-1-ln x，g'(x)=1-1/x，故 g 在 x=1 处取最小值 0。", "把不等式移项构造函数，求导确定最小值为 0，从而原不等式成立。", "证明不等式常用“作差＋构造函数＋最值”。")
        ]),
        mod("ma-trig", "三角函数", "恒等变换、图像性质与解三角形。", [
          leaf("ma-tri-1", "恒等变换", "已知 sin α=3/5，α 在第一象限，求 sin 2α。", "24/25。", "先得 cos α=4/5，再用 sin 2α=2sin α cos α=24/25。", "先判断象限和符号，再代公式。"),
          leaf("ma-tri-2", "图像性质", "求 y=2sin(2x+π/6) 的最小正周期。", "π。", "形如 y=Asin(ωx+φ) 的周期 T=2π/|ω|，这里 ω=2。", "周期只由 x 的系数决定。"),
          leaf("ma-tri-3", "正弦余弦定理", "三角形中 a=3，A=30°，B=60°，求 b。", "b=3√3。", "由正弦定理 a/sin A=b/sin B，得 b=3×sin60°/sin30°=3√3。", "先判断已知角边对应关系，避免把边角配错。"),
          leaf("ma-tri-4", "面积与最值", "已知两边长 4、5，夹角 60°，求三角形面积。", "5√3。", "S=½ab sin C=½×4×5×sin60°=5√3。", "面积公式与解三角形常联合考查。")
        ]),
        mod("ma-sequence", "数列", "等差、等比、递推与求和方法。", [
          leaf("ma-seq-1", "等差数列", "首项 2、公差 3，求第 10 项和前 10 项和。", "a₁₀=29，S₁₀=155。", "aₙ=a₁+(n-1)d；Sₙ=n(a₁+aₙ)/2。", "先识别首项、公差和项数。"),
          leaf("ma-seq-2", "等比数列", "首项 1、公比 2，求前 6 项和。", "63。", "S₆=1(2⁶-1)/(2-1)=63。", "使用等比求和时先确认 q≠1。"),
          leaf("ma-seq-3", "递推关系", "a₁=1，aₙ₊₁=2aₙ+1，求 a₃。", "7。", "a₂=3，a₃=7；也可构造 aₙ+1 为等比数列。", "先算前几项时注意下标，不要漏初始项。"),
          leaf("ma-seq-4", "错位相减与裂项", "求和 S=Σ k·2ᵏ，k=1 到 n。", "S=(n-1)2ⁿ⁺¹+2。", "设 S-2S 错位相减，得到等比部分和，再整理。裂项则适用 1/[k(k+1)] 型。", "看到“等差×等比”优先考虑错位相减。")
        ]),
        mod("ma-solid", "立体几何", "空间位置关系、角、距离和体积。", [
          leaf("ma-sol-1", "平行与垂直证明", "如何证明直线与平面平行？", "证明平面内存在一条直线与该直线平行。", "判定定理要求线不在平面内且与面内一条线平行；书写时三个条件缺一不可。", "几何法先找线线关系，向量法找共面与方向向量。"),
          leaf("ma-sol-2", "异面直线所成角", "如何求两条异面直线的夹角？", "通过平移转化为相交直线夹角，或求方向向量夹角。", "向量法用 |cos θ|=|u·v|/(|u||v|)，夹角范围为 [0,π/2]。", "异面直线夹角不取钝角。"),
          leaf("ma-sol-3", "二面角", "用向量法求二面角大小时要注意什么？", "先求两法向量夹角，再结合图形判断二面角是锐角还是钝角。", "法向量夹角与二面角可能互补；不能机械把二者等同。", "画图确认二面角的开口方向。"),
          leaf("ma-sol-4", "体积与距离", "三棱锥体积如何计算？", "V=⅓×底面积×高。", "也可用割补或等体积法。点到平面的距离可借助三棱锥体积反求。", "找高时确保高与底面所在平面垂直。")
        ]),
        mod("ma-analytic", "解析几何", "直线圆、圆锥曲线与定点定值。", [
          leaf("ma-ana-1", "直线与圆", "圆 x²+y²=5 到直线 y=x+1 的距离是多少？", "√2/2。", "圆心 (0,0)，距离 |0-0+1|/√2=√2/2。", "判断直线与圆位置关系时比较圆心到直线距离与半径。"),
          leaf("ma-ana-2", "圆锥曲线定义", "椭圆上一点到两焦点距离之和是多少？", "2a。", "根据椭圆定义，到两定点距离之和为常数 2a，且大于焦距 2c。", "定义题优先回到“距离之和/差”。"),
          leaf("ma-ana-3", "弦长与韦达定理", "直线与椭圆相交，如何求弦长？", "联立后用 √(1+k²)·|x₁-x₂|，再由韦达定理代入。", "设交点、联立方程、检查判别式，再用根与系数关系化简。", "弦长题最容易漏掉判别式 Δ>0。"),
          leaf("ma-ana-4", "定点定值问题", "证明动直线恒过定点，通常如何入手？", "设直线含参数，联立曲线后用韦达定理，整理出与参数无关的点。", "也可先取两个特殊位置猜定点，再进行一般证明。", "特殊值可以猜结论，但不能代替证明。")
        ]),
        mod("ma-prob", "概率与统计", "计数、概率分布与统计推断。", [
          leaf("ma-pr-1", "排列组合", "从 5 人中选 2 人排成一列，有多少种？", "20 种。", "A(5,2)=5×4=20；若只选不排，则为 C(5,2)=10。", "区分“选人”和“安排位置”。"),
          leaf("ma-pr-2", "古典概型", "掷一枚均匀骰子，点数为偶数的概率是多少？", "1/2。", "有利结果 3 个，总结果 6 个，概率 3/6=1/2。", "先确认每个基本事件等可能。"),
          leaf("ma-pr-3", "二项分布", "X~B(4,0.5)，求 E(X) 和 D(X)。", "E(X)=2，D(X)=1。", "二项分布 E(X)=np，D(X)=np(1-p)，代入 n=4、p=0.5。", "不要把二项分布与超几何分布混淆。"),
          leaf("ma-pr-4", "统计与回归", "回归直线一定经过哪个点？", "样本中心点 (x̄,ȳ)。", "回归方程用于估计趋势，不表示因果关系；计算预测值前应确认变量相关性和适用范围。", "回归题先读清“预测”与“实际”的差别。")
        ])
      ]
    },
    {
      id: "english",
      name: "英语",
      mark: "英",
      color: "#2a9d8f",
      tint: "#eaf8f5",
      description: "听力、阅读、七选五、完形、语法、写作与 3500 词记忆",
      modules: [
        mod("en-listening", "听力", "数字、细节、态度和推理。", [
          leaf("en-list-1", "数字与时间信息", "听到 8:45，选项出现 8:30、8:45、9:15，应如何定位？", "抓取时间前的 at/by/until 等关系词，选与原句关系一致的 8:45 或相应变化值。", "先记数字和介词，再判断是原时刻、提前量还是延迟量，避免只凭单个数字匹配。", "听前排好数字、星期、价格三栏笔记。"),
          leaf("en-list-2", "关键细节", "对话中人物为什么改变计划？", "回到转折词 but/because/instead 后定位原因。", "听力细节通常在信号词后出现；记录“谁、做什么、为什么”三要素。", "转折、因果和否定词是高频设题点。"),
          leaf("en-list-3", "态度与语气", "说话者用“That sounds great, but...”表示什么？", "总体积极但有保留，可能不完全赞同。", "语气题关注语调、形容词和转折结构，不能只根据 great 判断。", "把 but 后面的话作为真正态度依据。"),
          leaf("en-list-4", "推断与主旨", "对话最后两人可能去哪里？", "根据地点词、动作意图和告别语综合推断。", "推断题不需逐字对应，要利用人物目的和下一步动作；排除与原文冲突的选项。", "最后一句常承担结论信息。")
        ]),
        mod("en-reading", "阅读理解", "细节、推断、主旨、词义与篇章结构。", [
          leaf("en-read-1", "细节理解", "题目问“according to paragraph 2”时应如何定位？", "回到第二段寻找与题干同义替换的信息。", "先圈题干关键词，再按顺序定位；正确项常用同义改写，错误项常偷换范围或主体。", "先定位再判断，不凭常识选答案。"),
          leaf("en-read-2", "推理判断", "文中没有直接说结果，如何选最合理推断？", "选择有文本证据支持、但需一步逻辑转换的选项。", "推断必须能回到原文依据；不能加入个人常识，也不能做多步无依据猜测。", "排除“文中已明说”和“文中完全无关”。"),
          leaf("en-read-3", "主旨大意", "如何判断文章 best title？", "综合首尾段、重复主题词和各段功能，选覆盖全文且不过窄的标题。", "标题既要有吸引力，也要概括全文；只覆盖某段或某个细节的选项通常错误。", "看文章结构：问题—原因—解决仍是常见说明文框架。"),
          leaf("en-read-4", "词义猜测", "生词所在句出现“unlike”和对比结构，如何猜义？", "利用对比关系反推，选与另一对象相反的语义方向。", "关注定义、举例、因果、转折、并列等上下文线索，再用代入法验证。", "不要只看词根，语境关系更重要。"),
          leaf("en-read-5", "篇章结构与作者意图", "作者先提出问题再列举研究，主要目的是什么？", "引出观点并用证据说明问题的重要性或解决方向。", "结构题关注段际关系和标志词；作者意图要答“说明、劝说、比较、警示、介绍”等 communicative purpose。", "每段第一句常是功能线索。")
        ]),
        mod("en-seven", "七选五", "利用衔接、指代和逻辑关系补全文章。", [
          leaf("en-seven-1", "代词指代", "空格后出现“They also...”，空格应满足什么条件？", "前文应出现复数名词或群体，使 They 有明确指代。", "先找代词单复数和指代对象，再判断语义是否连贯。", "代词是七选五最高频的硬线索。"),
          leaf("en-seven-2", "逻辑连接", "空前后分别为问题和建议，适合什么过渡？", "转折/递进或“Here are some ways...”类承接句。", "根据段落功能选择连接：原因、结果、让步、并列、总结不能混用。", "先写一个中文逻辑连接词，再找英文对应。"),
          leaf("en-seven-3", "主题句与小标题", "小标题下的段落都在讲记录时间，标题应怎样概括？", "选择比段意略宽、能覆盖所有细节的短语。", "小标题通常句式一致，需覆盖本段核心而非某一条细节。", "注意平行结构和词性一致。"),
          leaf("en-seven-4", "复现与同义替换", "空格前后反复出现 goal，选项中有 target，是否有利？", "有利，goal 与 target 构成同义复现，但仍需检查整句逻辑。", "词汇复现只是候选信号，最终要用主语、时态和语义方向验证。", "同义替换不能代替上下文检查。")
        ]),
        mod("en-cloze", "完形填空", "语境、语义场、搭配和逻辑。", [
          leaf("en-cloze-1", "语义场", "故事讲救援，空格候选 help/save/protect 如何选？", "根据宾语和上下文强度选择 save 或 help。", "四个词可能都“说得通”，要从人物危险程度、动作结果和搭配强度区分。", "先判断空格在句中的核心功能。"),
          leaf("en-cloze-2", "固定搭配", "make a decision 中应选哪个动词？", "make。", "积累动词与名词、形容词与介词的高频搭配；不要按中文逐字翻译。", "用整块短语记忆，而不是孤立词。"),
          leaf("en-cloze-3", "上下文逻辑", "前句出现 disappointing，后句却写 learned a lot，应选什么连接？", "转折或让步关系。", "完形必须跨句阅读，利用情感变化、因果关系和时间线排除选项。", "圈出 but/however/although 等连接词。"),
          leaf("en-cloze-4", "语法一致性", "空格作主语且后接 is，候选单复数如何判断？", "选择与谓语 is 一致的单数名词。", "检查主谓一致、时态、语态和词性；语法排除可先去掉一半选项。", "先语法，再语境，最后搭配。")
        ]),
        mod("en-grammar", "语法", "时态、非谓语、从句与构词。", [
          leaf("en-gra-1", "时态与语态", "Since 2020, the school ___ (build) two labs.", "has built。", "since 引导时间起点，主句用现在完成时；若实验室作主语则考虑被动 has been built。", "先看主语与动作关系，再定时态。"),
          leaf("en-gra-2", "非谓语动词", "___ (see) from the hill, the city looks beautiful.", "Seen。", "city 与 see 是被动关系，所以用过去分词作状语。", "判断逻辑主语与动词是主动还是被动。"),
          leaf("en-gra-3", "定语从句", "This is the book ___ I bought yesterday.", "that/which，作 bought 的宾语，可省略。", "先找先行词和从句缺什么成分；缺宾语时关系代词可省略，缺主语时不可。", "关系副词 where/when/why 在从句中作状语。"),
          leaf("en-gra-4", "词性转换", "His ___ (decide) surprised everyone.", "decision。", "形容词性物主代词后需要名词，decide 的名词形式是 decision。", "先判断空格词性，再考虑词形变化。")
        ]),
        mod("en-writing", "写作", "应用文和读后续写。", [
          leaf("en-write-1", "应用文要点", "写一封邀请信，必须包含哪些信息？", "邀请目的、活动时间地点、活动内容和期待回复。", "先列要点再写句子，使用清晰分段的书信格式；避免堆砌高级词而漏信息。", "应用文评分首先看任务完成度。"),
          leaf("en-write-2", "读后续写情节", "续写第一段应如何承接原文？", "延续人物目标、冲突和情绪，写一个可验证的动作推进。", "先确定原文结尾的状态，再决定第一段解决哪一步；结尾与第二段开头自然衔接。", "不要突然增加无关人物或超自然转折。"),
          leaf("en-write-3", "动作与心理细节", "把“他很害怕”改写为细节描写。", "示例：His hands tightened around the strap as he stared at the dark doorway, not daring to breathe.", "用动作、感官和环境反映心理，少用 direct emotion 标签；细节要服务情节。", "一两个准确细节胜过一长串形容词。"),
          leaf("en-write-4", "语言与衔接升格", "如何让续写更连贯？", "使用动作链、时间连接和照应，而不是连续 simple sentence。", "把短句合并为合适的主从结构，注意时态一致和指代明确；每段设置一个小转折或进展。", "结尾回扣原文意象或主题，避免空泛总结。")
        ])
      ]
    },
    {
      id: "physics",
      name: "物理",
      mark: "物",
      color: "#8a5cf6",
      tint: "#f4efff",
      description: "力学、电磁学、热学、光学与实验",
      modules: [
        mod("ph-kinematics", "运动学", "图像、匀变速、自由落体和相对运动。", [
          leaf("ph-kin-1", "x-t 与 v-t 图像", "v-t 图像中图线与时间轴围成的面积表示什么？", "位移；时间轴上方面积为正，下方面积为负。", "图像题先辨横纵轴，再看斜率与面积：x-t 斜率是速度，v-t 斜率是加速度，面积是位移。", "不能把 v-t 图像当作运动轨迹。"),
          leaf("ph-kin-2", "匀变速直线运动", "初速 2m/s、加速度 3m/s²，2s 后速度是多少？", "8m/s。", "v=v₀+at=2+3×2=8m/s；位移可用 x=v₀t+½at²。", "先定正方向，再代符号。"),
          leaf("ph-kin-3", "自由落体", "忽略空气阻力，物体下落 2s 的速度和高度约是多少？", "v≈20m/s，h≈20m。", "取 g≈10m/s²，v=gt=20m/s，h=½gt²=20m。", "自由落体的加速度大小和方向固定。"),
          leaf("ph-kin-4", "相对运动与追及", "两车同向追赶，何时相距最远？", "速度相等时。", "速度相等前距离增大，之后若后者速度更大，距离开始减小；用 v-t 图像看面积差更直观。", "临界条件常是速度相等、接触或细绳绷直。")
        ]),
        mod("ph-force", "相互作用与牛顿定律", "受力分析、摩擦、弹力与连接体。", [
          leaf("ph-force-1", "受力分析", "斜面上的物块受哪些力？", "重力、支持力；若有相对滑动或趋势，还可能有摩擦力。", "按场力、接触力顺序画图；每个力找施力物体，不能把“下滑力”当作独立力。", "先整体再隔离，防止漏力和重复。"),
          leaf("ph-force-2", "静摩擦与动摩擦", "水平推箱未推动时，静摩擦力多大？", "大小等于推力，方向与推力相反。", "静摩擦大小由平衡条件决定，不超过最大静摩擦；滑动摩擦用 f=μN。", "“动摩擦因数”不能直接乘正压力求静摩擦。"),
          leaf("ph-force-3", "牛顿第二定律", "质量 2kg 的物体受合力 10N，加速度多少？", "5m/s²。", "a=F合/m=10/2=5m/s²，方向与合力相同。", "先求合力，不要把某个外力直接当合力。"),
          leaf("ph-force-4", "连接体", "两个物体用轻绳相连，求加速度时如何处理？", "可先整体求共同加速度，再隔离其中一个求绳张力。", "整体法减少内力，隔离法求内力；两物体加速度相同的条件是绳不可伸长且绷直。", "先判断是否共加速度。")
        ]),
        mod("ph-energy", "功和能", "动能定理、机械能守恒与功率。", [
          leaf("ph-en-1", "功的计算", "力 10N 与位移 2m 同向，做功多少？", "20J。", "W=Fx cosθ；若力与位移垂直，则不做功。", "先确认力、位移和夹角。"),
          leaf("ph-en-2", "动能定理", "物体从静止在合力 5N 下移动 4m，末动能多少？", "20J。", "W合=ΔEk，所以 Ek=5×4=20J。", "动能定理适合涉及位移而不关心时间的题。"),
          leaf("ph-en-3", "机械能守恒", "只有重力做功时什么量保持不变？", "机械能。", "需要判断是否只有重力或弹簧弹力做功；若有摩擦生热，机械能减少。", "写守恒前先说明系统。"),
          leaf("ph-en-4", "功率", "力 20N、速度 3m/s，且同向，功率多少？", "60W。", "P=Fv cosθ；平均功率也可用 W/t。", "瞬时功率与平均功率不要混用。")
        ]),
        mod("ph-momentum", "动量", "冲量、守恒与碰撞。", [
          leaf("ph-mom-1", "动量与冲量", "动量 p=mv，冲量 I=Ft；二者的关系是什么？", "合外力的冲量等于动量变化量。", "I合=Δp。动量和冲量都是矢量，必须规定正方向。", "碰撞问题先画正方向。"),
          leaf("ph-mom-2", "动量守恒条件", "碰撞过程中动量何时守恒？", "系统所受合外力为零，或内力远大于外力、作用时间极短时近似守恒。", "选取系统和过程，检查外力冲量是否可忽略；不要只看“有没有摩擦”。", "分过程处理时每段都要重新判断守恒条件。"),
          leaf("ph-mom-3", "弹性碰撞", "弹性碰撞同时满足什么？", "动量守恒且动能守恒。", "完全非弹性碰撞只保证动量守恒，碰后共同速度；一般碰撞机械能有损失。", "先判断碰撞类型，再列方程。"),
          leaf("ph-mom-4", "多过程与临界", "子弹射入木块后共同运动，属于什么碰撞？", "完全非弹性碰撞。", "射入过程极短，动量近似守恒；共同运动阶段再结合能量、摩擦或运动学。", "注意区分“碰撞瞬间”和“碰后运动”。")
        ]),
        mod("ph-circular", "圆周运动与万有引力", "向心力、卫星和宇宙速度。", [
          leaf("ph-cir-1", "向心力来源", "水平转盘上随盘转动的物体，向心力由什么提供？", "静摩擦力。", "向心力是效果力，不是额外受力；由指向圆心的合力提供。", "受力图中不要重复画“向心力”。"),
          leaf("ph-cir-2", "竖直圆临界", "细绳连接小球在竖直平面内做圆周运动，最高点最小速度条件是什么？", "重力提供向心力，v_min=√(gR)。", "绳模型最高点不能有支撑；杆模型可有支持力，临界条件不同。", "先判断绳还是杆。"),
          leaf("ph-cir-3", "卫星运行", "轨道半径越大，卫星线速度和周期如何变化？", "线速度变小，周期变大。", "由 GMm/r²=mv²/r 得 v=√(GM/r)，周期随 r 增大。", "卫星“高轨低速长周期”。"),
          leaf("ph-cir-4", "完全失重", "空间站中的物体为什么看起来没有重量？", "物体与空间站具有相同的重力加速度，相对空间站处于完全失重。", "重力并未消失，而是全部用于提供绕地加速度；支持力为零。", "不要误写“重力消失”。")
        ]),
        mod("ph-electric", "电场", "库仑定律、电势、电容和带电粒子。", [
          leaf("ph-ele-1", "库仑定律", "两点电荷距离变为原来的 2 倍，库仑力如何变化？", "变为原来的 1/4。", "F=kq₁q₂/r² 与距离平方成反比。", "算比值时用平方关系。"),
          leaf("ph-ele-2", "电场强度与电势", "电场强度为零处，电势一定为零吗？", "不一定。", "E 描述电场力作用强弱，φ 描述能量属性；二者大小没有必然同步关系。", "注意电场线方向指向电势降低方向。"),
          leaf("ph-ele-3", "电容器", "平行板电容器充电后断开电源，增大板间距，电压如何变化？", "电荷量不变，电容减小，电压增大。", "C=εS/(4πkd)，Q不变时 U=Q/C。", "先判断电源是否连接，决定 Q 或 U 哪个不变。"),
          leaf("ph-ele-4", "带电粒子偏转", "电子垂直进入匀强电场后的轨迹是什么？", "抛物线，类似平抛运动。", "沿初速方向匀速，沿电场方向受恒力加速；用分运动合成。", "先分解，再分别列运动方程。")
        ]),
        mod("ph-em", "恒定电流与电磁感应", "电路、安培力、磁通量和感应定律。", [
          leaf("ph-em-1", "闭合电路欧姆定律", "电源电动势 6V、内阻 1Ω、外阻 5Ω，电流多少？", "1A。", "I=E/(R+r)=6/(5+1)=1A。", "路端电压 U=E-Ir，不等于电动势。"),
          leaf("ph-em-2", "安培力", "电流方向与磁场平行时，安培力多大？", "为零。", "F=BIL sinθ，θ 为电流与磁场夹角；垂直时最大。", "方向用左手定则，别与洛伦兹力右手/左手混淆。"),
          leaf("ph-em-3", "法拉第电磁感应", "磁通量变化更快，感应电动势如何变化？", "一般增大；E=nΔΦ/Δt。", "感应电动势由磁通量变化率决定，不由磁通量本身大小决定。", "注意“变化量”与“变化率”。"),
          leaf("ph-em-4", "楞次定律", "如何判断感应电流方向？", "感应电流的磁场总要阻碍引起感应电流的磁通量变化。", "先判断原磁通量增减，再确定感应磁场方向，最后用右手螺旋判断电流。", "核心理念是“阻碍变化”，不是“阻止变化”。")
        ]),
        mod("ph-experiment", "物理实验", "纸带、伏安、光学和误差分析。", [
          leaf("ph-exp-1", "纸带数据处理", "打点计时器纸带如何求某点瞬时速度？", "用相邻两点间平均速度近似该点瞬时速度。", "选包含该点的短时间间隔，测位移和时间，减小读数误差。", "计时器频率决定每两个点的时间间隔。"),
          leaf("ph-exp-2", "伏安法测电阻", "电流表内接还是外接如何选择？", "大电阻用内接法，小电阻用外接法。", "内接法测大电阻误差较小，外接法适合小电阻；还要考虑电表量程和滑动变阻器接法。", "比较 R 与√(R_A R_V) 判断接法。"),
          leaf("ph-exp-3", "光学实验", "测玻璃砖折射率需要记录哪些方向和长度？", "入射光线、出射光线及玻璃砖边界，进而确定入射角和折射角。", "用插针法确定光线，n=sin i/sin r；多次测量取平均。", "光路图必须标法线和角度。"),
          leaf("ph-exp-4", "误差与有效数字", "系统误差和偶然误差有什么区别？", "系统误差方向较固定，偶然误差随机波动。", "增加测量次数可减小偶然误差；校准仪器、改进方法是处理系统误差的主要途径。", "误差不是错误，错误应避免，误差应评估。")
        ])
      ]
    },
    {
      id: "chemistry",
      name: "化学",
      mark: "化",
      color: "#d97706",
      tint: "#fff8e8",
      description: "物质结构、无机、反应原理、电化学、有机与实验",
      modules: [
        mod("ch-amount", "物质的量与化学计算", "摩尔、浓度、产量和离子反应。", [
          leaf("ch-amt-1", "物质的量换算", "18g 水的物质的量是多少？", "1mol。", "n=m/M，水摩尔质量约 18g/mol，因此 n=18/18=1mol。", "先统一单位，再判断粒子种类。"),
          leaf("ch-amt-2", "溶液浓度", "0.5mol NaCl 溶于水配成 1L 溶液，浓度是多少？", "0.5mol/L。", "c=n/V。注意体积是溶液体积，不是溶剂体积。", "取出一部分溶液，浓度不变，物质的量按体积比例减小。"),
          leaf("ch-amt-3", "产率与限量试剂", "反应物按化学计量比投放时如何判断谁先耗尽？", "先按方程式换算成物质的量，再比较比值。", "将各反应物的 n 除以方程式中系数，最小者为限量试剂；理论上消耗量由它决定。", "产率=实际产量/理论产量×100%。"),
          leaf("ch-amt-4", "离子方程式正误", "盐酸与氢氧化钠反应如何写离子方程式？", "H⁺+OH⁻→H₂O。", "删去两侧相同的旁观离子，检查电荷守恒和原子守恒，并保留难溶、气体、弱电解质化学式。", "先写正确化学方程式，再拆强电解质。")
        ]),
        mod("ch-periodic", "物质结构与周期律", "原子结构、周期表与元素性质。", [
          leaf("ch-per-1", "原子结构与电子排布", "氯原子核外电子排布如何写？", "1s²2s²2p⁶3s²3p⁵。", "按能级顺序填充并遵守能量最低、泡利和洪特规则；同周期从左到右原子半径总体减小。", "电子排布题先确认元素原子序数。"),
          leaf("ch-per-2", "周期律", "同主族从上到下，碱金属金属性如何变化？", "增强。", "原子半径增大、最外层电子更易失去，金属性增强；最高价氧化物对应水化物碱性增强。", "比较金属性看失电子能力，不只看反应现象。"),
          leaf("ch-per-3", "化学键与晶体", "NaCl 中存在哪种化学键？", "离子键。", "离子晶体由阴阳离子通过静电作用构成；分子晶体中还可能有分子间作用力和氢键。", "氢键不是化学键；金属晶体存在金属键。"),
          leaf("ch-per-4", "元素推断", "短周期元素 A 最高价氧化物水化物呈两性，A 可能是？", "铝。", "Al₂O₃、Al(OH)₃具有两性；结合原子序数、族序数和特征反应确认。", "元素推断先找唯一特征反应。")
        ]),
        mod("ch-inorganic", "无机物及其性质", "钠、铁、铝、氯硫氮等元素化合物。", [
          leaf("ch-in-1", "钠及其化合物", "过氧化钠与水反应的产物是什么？", "NaOH 和 O₂。", "2Na₂O₂+2H₂O→4NaOH+O₂↑；该反应中过氧化钠发生歧化。", "注意过氧化钠不是碱性氧化物。"),
          leaf("ch-in-2", "铁及其价态", "Fe²⁺转化为 Fe³⁺需要什么条件？", "需要氧化剂，如氯气或酸性过氧化氢。", "Fe²⁺具有还原性，Fe³⁺具有氧化性；检验 Fe³⁺常用 KSCN 溶液变红。", "先判断价态变化方向，再配平。"),
          leaf("ch-in-3", "铝的两性", "Al(OH)₃分别与强酸、强碱反应说明什么？", "Al(OH)₃具有两性，既能与酸反应又能与碱反应。", "铝及其氧化物、氢氧化物都具有两性；但铝本身与强碱反应本质是氧化膜和铝被氧化。", "两性物质不要写成只能与酸反应。"),
          leaf("ch-in-4", "氯硫氮性质", "SO₂使品红褪色，加热后恢复说明什么？", "SO₂具有漂白性且漂白可逆，属于暂时性漂白。", "SO₂还可被氧化为 SO₃，具有还原性；Cl₂漂白通常不可逆。", "区分漂白性、还原性和酸性氧化物性质。")
        ]),
        mod("ch-kinetics", "化学反应原理", "速率、平衡、平衡常数与移动。", [
          leaf("ch-kin-1", "反应速率", "增大反应物浓度通常如何影响反应速率？", "增大，单位时间内有效碰撞增多。", "升温改变速率常数，催化剂降低活化能；压强只显著影响有气体参与的反应。", "速率变化不等同于平衡移动。"),
          leaf("ch-kin-2", "平衡移动", "恒温恒容下向平衡体系加入反应物，平衡如何移动？", "平衡通常向正反应方向移动，但平衡常数不变。", "勒夏特列原理描述“减弱改变”的方向；若加入固体或恒容惰性气体，需具体分析。", "先判断改变的是浓度、压强还是温度。"),
          leaf("ch-kin-3", "平衡常数", "改变温度时平衡常数一定变化吗？", "一定会变化（对非零反应热的可逆反应）。", "K 只与温度有关；浓度、压强改变通常不改变 K，只改变平衡组成。", "催化剂不改变 K，也不改变平衡转化率。"),
          leaf("ch-kin-4", "反应方向与图像", "根据浓度商 Q 与 K 的大小如何判断反应方向？", "Q<K 正向；Q=K 平衡；Q>K 逆向。", "先写平衡常数表达式，再代入任意时刻浓度计算 Q；图像题要区分速率曲线和转化率曲线。", "K 表达式不包含固体和纯液体。")
        ]),
        mod("ch-solution", "水溶液中的平衡", "pH、水解、沉淀和滴定。", [
          leaf("ch-sol-1", "pH 计算", "25℃时 0.01mol/L HCl 的 pH 是多少？", "2。", "HCl 完全电离，[H⁺]=0.01mol/L，pH=-lg(0.01)=2。", "强酸强碱先算离子浓度，再取负对数。"),
          leaf("ch-sol-2", "盐类水解", "NaHCO₃溶液为什么呈弱碱性？", "HCO₃⁻水解程度大于电离程度，产生较多 OH⁻。", "判断酸碱性要比较弱离子水解与电离的主次；水解规律：越弱越水解。", "不要把 NaHCO₃只当作酸式盐就判为酸性。"),
          leaf("ch-sol-3", "沉淀溶解平衡", "加入同离子对难溶盐溶解度有何影响？", "通常降低溶解度，沉淀平衡向生成沉淀方向移动。", "Ksp 只随温度变化；比较 Q 与 Ksp 判断沉淀生成或溶解。", "同离子效应是定量题常见条件。"),
          leaf("ch-sol-4", "滴定与误差", "滴定管未润洗会造成什么误差？", "若装入标准液前未用标准液润洗，标准液被稀释，读数偏大。", "分析误差要沿着“实际浓度→消耗体积→计算浓度”链条判断偏高或偏低。", "锥形瓶通常只用水洗净，不能用待测液润洗。")
        ]),
        mod("ch-electro", "电化学", "原电池、电解池、腐蚀与电极反应。", [
          leaf("ch-ec-1", "原电池原理", "铜锌原电池中锌为什么作负极？", "锌更活泼，易失电子发生氧化反应。", "原电池负极发生氧化，正极发生还原；电子经外电路从负极到正极。", "溶液中离子移动方向与电子相反。"),
          leaf("ch-ec-2", "电解池电极", "电解饱和食盐水时阳极产生什么？", "氯气。", "阳极 Cl⁻失电子生成 Cl₂；阴极水得电子生成 H₂和 OH⁻。", "先判阴阳极，再写放电顺序。"),
          leaf("ch-ec-3", "金属腐蚀", "钢铁在潮湿空气中主要发生什么腐蚀？", "吸氧腐蚀。", "中性或弱酸性环境中氧气得电子；酸性较强时可能发生析氢腐蚀。", "防止腐蚀可用隔绝氧气、牺牲阳极或外加电流。"),
          leaf("ch-ec-4", "电极反应式配平", "写电极反应时优先保证什么？", "电子、电荷和原子守恒。", "先判断反应物和产物，再补 H⁺/OH⁻或 H₂O，最后配电子数；总反应中电子数要相等。", "酸性补 H⁺，碱性补 OH⁻。")
        ]),
        mod("ch-organic", "有机化学", "官能团、同分异构、反应类型和合成。", [
          leaf("ch-org-1", "官能团性质", "乙醇和乙酸分别含有什么官能团？", "乙醇含羟基，乙酸含羧基。", "羟基可发生取代、氧化和酯化；羧基具有酸性，可与醇酯化。", "先识别官能团，再预测性质。"),
          leaf("ch-org-2", "同分异构体", "丁烷有几种碳骨架异构？", "2 种：正丁烷和异丁烷。", "先写碳骨架，再考虑双键位置、官能团位置和立体异构；不要重复等价结构。", "系统命名可帮助检查重复。"),
          leaf("ch-org-3", "反应类型", "乙烯使溴水褪色属于什么反应？", "加成反应。", "乙烯与 Br₂加成生成 1,2-二溴乙烷；取代反应通常是原子或基团互换，注意区分。", "褪色不一定都是氧化，需看试剂和条件。"),
          leaf("ch-org-4", "有机合成路线", "设计醇到酯的合成路线时如何逆推？", "酯逆向拆分为羧酸和醇，再判断原料如何氧化或取代得到。", "先确定目标官能团，逆推每一步反应条件和保护基需求；同时检查碳骨架是否改变。", "写路线要标条件，不能只写产物。")
        ]),
        mod("ch-experiment", "化学实验", "分离提纯、检验、制备与误差。", [
          leaf("ch-exp-1", "分离提纯", "分离互溶且沸点不同的液体常用什么方法？", "蒸馏。", "过滤分离不溶固体与液体，萃取分离溶质在不同溶剂中的溶解度差异，结晶适用于溶解度随温度变化明显的情况。", "先看混合物状态和性质差异。"),
          leaf("ch-exp-2", "离子检验", "检验 Cl⁻常用什么试剂？", "稀硝酸酸化的 AgNO₃溶液，产生白色沉淀。", "检验 SO₄²⁻用 BaCl₂和稀盐酸；检验 NH₄⁺可加 NaOH 加热并用湿润红色石蕊试纸。", "先排除干扰离子，再描述现象和结论。"),
          leaf("ch-exp-3", "气体制备", "实验室制取 CO₂常用什么药品？", "大理石或石灰石与稀盐酸。", "不能用稀硫酸，因为生成的 CaSO₄微溶会覆盖固体表面；收集用向上排空气法。", "装置选择取决于反应物状态和条件。"),
          leaf("ch-exp-4", "实验误差与安全", "量筒量取液体时俯视读数会使实际体积怎样？", "实际加入液体的体积偏少。", "读数时视线与凹液面最低处齐平；误差分析要区分读数与实际量。", "涉及易燃、有毒气体时先检查装置气密性和尾气处理。")
        ])
      ]
    },
    {
      id: "biology",
      name: "生物",
      mark: "生",
      color: "#65a30d",
      tint: "#f4fbe8",
      description: "细胞、代谢、遗传、调节、进化、生态与生物技术",
      modules: [
        mod("bi-cell", "分子与细胞", "蛋白质、核酸、膜和细胞器。", [
          leaf("bi-cell-1", "蛋白质结构与功能", "蛋白质多样性由哪些因素决定？", "氨基酸种类、数目、排列顺序及肽链空间结构。", "蛋白质功能由结构决定；高温、强酸强碱会破坏空间结构并导致变性。", "区分变性（结构破坏）与水解（肽键断裂）。"),
          leaf("bi-cell-2", "核酸", "DNA 与 RNA 在组成和功能上有什么不同？", "DNA 多为双链、含脱氧核糖和胸腺嘧啶；RNA 多为单链、含核糖和尿嘧啶。", "DNA 储存遗传信息，RNA 参与传递和表达；两者都由核苷酸组成。", "先分清五碳糖和碱基差异。"),
          leaf("bi-cell-3", "细胞膜与运输", "主动运输与被动运输的核心区别是什么？", "主动运输需要载体蛋白并消耗能量，可逆浓度梯度。", "自由扩散和协助扩散都属于被动运输，不消耗 ATP；胞吞胞吐属于大分子运输。", "先判断方向是否逆浓度，再看是否耗能。"),
          leaf("bi-cell-4", "细胞器分工", "分泌蛋白从合成到分泌经过哪些结构？", "核糖体→内质网→高尔基体→细胞膜。", "线粒体供能，核糖体合成肽链，内质网加工运输，高尔基体进一步加工分类。", "膜面积变化是常考点。")
        ]),
        mod("bi-metabolism", "细胞代谢", "酶、ATP、光合作用和呼吸作用。", [
          leaf("bi-met-1", "酶的特性", "高温、低温对酶活性的影响有何不同？", "低温抑制但通常可逆，高温使酶变性失活。", "酶通过降低活化能提高反应速率；最适 pH 和最适温度是重要条件。", "酶不改变反应平衡点，只改变达到平衡的速度。"),
          leaf("bi-met-2", "ATP", "ATP 水解主要释放什么形式的能量？", "化学能，供生命活动利用。", "ATP 与 ADP 相互转化，能量来源和去向不同；ATP 不是储能大分子。", "ATP 可看作能量“通用货币”。"),
          leaf("bi-met-3", "光合作用", "光反应为暗反应提供哪些物质？", "ATP 和 NADPH，暗反应利用其还原 CO₂。", "光反应在类囊体薄膜上进行，暗反应在叶绿体基质进行；氧气来自水的光解。", "光合速率受光照、CO₂、温度等共同限制。"),
          leaf("bi-met-4", "细胞呼吸", "有氧呼吸和无氧呼吸的共同点是什么？", "都分解有机物释放能量，都有阶段产生 ATP。", "有氧呼吸主要在线粒体进行，无氧呼吸在细胞质基质进行；酒精发酵和乳酸发酵产物不同。", "无氧呼吸不产生 CO₂时通常是乳酸发酵。")
        ]),
        mod("bi-genetics", "遗传与变异", "孟德尔规律、基因表达和变异。", [
          leaf("bi-gen-1", "分离定律", "Aa 自交，后代表型比是多少？", "显性:隐性=3:1。", "配子随机结合，AA:Aa:aa=1:2:1，显性表型占 3/4。", "先分清基因型比与表型比。"),
          leaf("bi-gen-2", "自由组合定律", "AaBb 自交，两对基因独立遗传，后代表型比？", "9:3:3:1。", "每对基因按 3:1 分离，独立相乘；测交则为 1:1:1:1。", "判断基因是否位于非同源染色体。"),
          leaf("bi-gen-3", "基因表达", "转录和翻译分别在哪里进行？", "真核细胞中转录主要在细胞核，翻译在核糖体。", "DNA→mRNA 为转录，mRNA→蛋白质为翻译；密码子位于 mRNA，反密码子位于 tRNA。", "注意模板链与编码链的区别。"),
          leaf("bi-gen-4", "遗传病概率", "常染色体隐性遗传病，两个携带者后代患病概率？", "1/4。", "Aa×Aa，后代 aa 概率 1/4；先写遗传方式，再列配子与后代。", "概率题每一步都要说明事件。")
        ]),
        mod("bi-regulation", "生命活动调节", "神经、体液、免疫与植物激素。", [
          leaf("bi-reg-1", "神经调节", "兴奋在突触处为什么单向传递？", "神经递质只能由突触前膜释放并作用于突触后膜。", "静息电位主要与 K⁺外流有关，动作电位与 Na⁺内流有关；突触传递有时间延搁。", "电信号到化学信号再回到电信号。"),
          leaf("bi-reg-2", "激素调节", "胰岛素和胰高血糖素如何维持血糖稳定？", "胰岛素降血糖，胰高血糖素升血糖，二者拮抗。", "血糖调节有神经—体液共同参与；胰岛素促进组织摄取利用葡萄糖并抑制糖原分解。", "注意激素作用后会被灭活。"),
          leaf("bi-reg-3", "免疫调节", "疫苗为什么能预防疾病？", "刺激机体产生特异性抗体和记忆细胞，再次接触抗原时快速应答。", "体液免疫主要针对细胞外病原体，细胞免疫主要针对胞内病原体和异常细胞。", "区分抗体与效应 T 细胞的作用对象。"),
          leaf("bi-reg-4", "植物激素", "生长素作用为什么具有两重性？", "低浓度促进生长，高浓度可能抑制生长。", "不同器官敏感程度不同，根最敏感、茎最不敏感；顶端优势与侧芽生长素浓度有关。", "结合浓度和器官判断效应。")
        ]),
        mod("bi-evolution", "生物进化", "自然选择、种群基因频率和物种形成。", [
          leaf("bi-evo-1", "自然选择", "自然选择直接作用于什么？", "表型，并导致种群基因频率定向改变。", "变异具有随机性，选择具有方向性；适应是长期选择的结果。", "不要把“用进废退”与自然选择混同。"),
          leaf("bi-evo-2", "基因频率", "某种群 AA 20%、Aa 60%、aa 20%，A 的基因频率？", "50%。", "A 频率=AA+½Aa=0.2+0.3=0.5；用配子比例计算更直观。", "注意基因型频率与基因频率不同。"),
          leaf("bi-evo-3", "物种形成", "生殖隔离出现意味着什么？", "形成了新物种，产生标志通常是生殖隔离。", "地理隔离可促进分化，但不是新物种形成的必要条件；生殖隔离才是关键。", "判断物种看能否自然交配并产生可育后代。"),
          leaf("bi-evo-4", "协同进化与多样性", "捕食者与被捕食者相互影响体现什么？", "协同进化，双方在相互选择中共同进化。", "生物多样性包括基因、物种和生态系统多样性；保护多样性也为生态系统稳定提供基础。", "区分个体适应与群体进化。")
        ]),
        mod("bi-ecology", "生态学", "种群、群落、生态系统与保护。", [
          leaf("bi-eco-1", "种群数量", "J 形增长与 S 形增长的主要差异？", "J 形无环境阻力持续增长；S 形受资源限制趋于 K 值。", "S 形增长在 K/2 时增长速率最大，适合可持续利用的种群应维持在 K/2 附近。", "K 值不是固定不变，会随环境改变。"),
          leaf("bi-eco-2", "群落结构", "群落的空间结构包括哪些？", "垂直结构和水平结构。", "垂直结构表现为分层，水平结构表现为镶嵌分布；两者都提高资源利用效率。", "注意种群也有空间特征，但群落层次不同。"),
          leaf("bi-eco-3", "能量流动", "能量流动为什么逐级递减？", "每个营养级都有呼吸消耗、未利用和分解者利用，传递效率约 10%—20%。", "能量单向流动、物质循环利用；食物链中不能出现分解者和非生物成分。", "计算能量传递时先明确相邻营养级。"),
          leaf("bi-eco-4", "生态系统稳定与保护", "生物多样性越高，生态系统稳定性一定越高吗？", "总体抵抗力稳定性通常更强，但仍受结构和外界干扰强度影响。", "保护生物多样性要保护栖息地、建立保护区并减少污染，不能只保护单个物种。", "区分抵抗力稳定性和恢复力稳定性。")
        ]),
        mod("bi-biotech", "生物技术与实验", "基因工程、细胞工程、发酵和实验设计。", [
          leaf("bi-bio-1", "基因工程", "基因工程的基本工具有哪些？", "限制酶、DNA 连接酶和载体。", "限制酶切割特定序列，连接酶连接磷酸二酯键，载体把目的基因导入受体细胞。", "注意限制酶切割产生黏性末端或平末端。"),
          leaf("bi-bio-2", "细胞工程", "植物组织培养依据什么原理？", "细胞全能性。", "脱分化形成愈伤组织，再分化形成芽和根；动物体细胞核移植体现细胞核全能性。", "植物组织培养通常需要无菌操作和植物激素。"),
          leaf("bi-bio-3", "微生物培养", "培养基灭菌与接种环灭菌分别常用什么方法？", "培养基高压蒸汽灭菌，接种环灼烧灭菌。", "无菌操作包括灭菌、消毒和防止污染；倒平板应在酒精灯火焰附近进行。", "先判断对象是培养基、器皿还是接种工具。"),
          leaf("bi-bio-4", "实验设计与对照", "探究某因素对酶活性的影响，实验变量如何设置？", "自变量为该因素，因变量为酶促反应速率，其他条件保持相同且适宜。", "遵循单一变量、对照和重复原则；实验结果要能区分不同处理组。", "先写实验目的，再确定自变量和观察指标。")
        ])
      ]
    }
  ];

  const vocabSeed = [
    ["abandon", "放弃；抛弃", "They had to abandon the plan because of the storm."],
    ["ability", "能力", "Reading improves your ability to understand the world."],
    ["absent", "缺席的；不在的", "He was absent from class yesterday."],
    ["absorb", "吸收；专注", "Plants absorb water through their roots."],
    ["abstract", "抽象的；摘要", "The idea is too abstract to explain in one sentence."],
    ["accept", "接受；承认", "She accepted the invitation with pleasure."],
    ["access", "进入；使用权", "Students have access to the online library."],
    ["accident", "事故；意外", "The traffic accident caused a long delay."],
    ["accompany", "陪伴；伴随", "A teacher accompanied the students on the trip."],
    ["accomplish", "完成；实现", "We accomplished the task ahead of schedule."],
    ["account", "账户；解释；占比", "Please account for the change in your plan."],
    ["accurate", "准确的", "The report gives an accurate description of the event."],
    ["achieve", "实现；取得", "Daily practice helps you achieve your goals."],
    ["acquire", "获得；习得", "Children acquire language through communication."],
    ["adapt", "适应；改编", "It takes time to adapt to a new environment."],
    ["adequate", "充足的；适当的", "Make sure you get adequate sleep before the exam."],
    ["adjust", "调整；适应", "You can adjust the plan according to your progress."],
    ["admire", "钦佩；欣赏", "I admire her courage and patience."],
    ["admit", "承认；准许进入", "He admitted that he had made a mistake."],
    ["advantage", "优势；有利条件", "Small classes have an advantage in discussion."],
    ["adventure", "冒险；奇遇", "The journey became an unexpected adventure."],
    ["advocate", "提倡；倡导者", "Many scientists advocate protecting wetlands."],
    ["affect", "影响", "Lack of sleep can affect your memory."],
    ["afford", "负担得起", "We cannot afford to waste any more time."],
    ["agenda", "议程；日程", "The meeting agenda was sent to everyone."],
    ["aim", "目标；瞄准", "Our aim is to improve learning efficiency."],
    ["alarm", "警报；使惊恐", "The fire alarm woke everyone up."],
    ["alternative", "可替代的；替代方案", "Walking is a healthy alternative to driving."],
    ["ambition", "抱负；雄心", "Her ambition is to become a doctor."],
    ["ancient", "古代的；古老的", "The town is famous for its ancient bridge."],
    ["announce", "宣布", "The school announced a change in the schedule."],
    ["annual", "每年的；年度的", "The annual sports meeting will be held in May."],
    ["anxious", "焦虑的；渴望的", "She felt anxious before the interview."],
    ["apparent", "显然的；表面上的", "It soon became apparent that the plan needed revision."],
    ["appeal", "吸引；呼吁；上诉", "The idea appeals to young readers."],
    ["appreciate", "欣赏；感激；理解", "I appreciate your help with the project."],
    ["approach", "方法；接近", "We need a different approach to the problem."],
    ["appropriate", "合适的；恰当的", "Choose an appropriate example for your argument."],
    ["approve", "批准；赞成", "The teacher approved our research plan."],
    ["argue", "争论；论证", "The article argues that exercise improves mood."],
    ["arrange", "安排；整理", "We arranged the books by subject."],
    ["assess", "评估；评价", "The test is designed to assess reading skills."],
    ["assume", "假定；承担", "Do not assume that the first answer is correct."],
    ["atmosphere", "大气；气氛", "Soft light created a calm atmosphere."],
    ["attempt", "尝试；企图", "She made an attempt to solve the puzzle."],
    ["attitude", "态度", "A positive attitude can support long-term learning."],
    ["attract", "吸引", "The exhibition attracted many visitors."],
    ["available", "可获得的；有空的", "The full report is available online."],
    ["avoid", "避免", "Review regularly to avoid forgetting."],
    ["aware", "意识到的", "Be aware of the time limit while reading."],
    ["balance", "平衡；余额", "Try to balance study and rest."],
    ["barrier", "障碍；屏障", "Fear can become a barrier to communication."],
    ["benefit", "利益；受益", "Both students and teachers benefit from feedback."],
    ["brief", "简短的；摘要", "Write a brief summary of each paragraph."],
    ["broad", "宽阔的；广泛的", "The course provides a broad introduction to biology."],
    ["calculate", "计算；推测", "Calculate the total cost before you start."],
    ["campaign", "运动；活动", "They started a campaign to save water."],
    ["capable", "有能力的", "She is capable of handling the task alone."],
    ["capture", "捕捉；吸引", "The photo captures a moment of joy."],
    ["career", "职业；生涯", "He is preparing for a career in engineering."],
    ["challenge", "挑战；质疑", "Learning a language is a long-term challenge."],
    ["character", "性格；角色；字符", "The main character changes throughout the story."],
    ["charge", "收费；指控；充电", "The museum does not charge an entrance fee."],
    ["circumstance", "情况；环境", "Under these circumstances, changing the plan is wise."],
    ["claim", "声称；要求；索赔", "The report claims that the method is effective."],
    ["classify", "分类", "Scientists classify organisms by shared features."],
    ["combine", "结合；联合", "Combine short reviews with active recall."],
    ["comment", "评论；发表意见", "The teacher made a helpful comment on my essay."],
    ["commit", "承诺；犯；投入", "She committed herself to daily practice."],
    ["communicate", "交流；传达", "Clear examples help communicate complex ideas."],
    ["compare", "比较", "Compare the two graphs before drawing a conclusion."],
    ["compete", "竞争；比赛", "Students competed in the speech contest."],
    ["complex", "复杂的；建筑群", "The problem is more complex than it appears."],
    ["concentrate", "集中；专注", "It is easier to concentrate in a quiet room."],
    ["concept", "概念", "The teacher explained the concept with a diagram."],
    ["concern", "担忧；涉及", "Climate change is a global concern."],
    ["conclude", "得出结论；结束", "We can conclude that the evidence supports the claim."],
    ["condition", "条件；状况", "The experiment was carried out under controlled conditions."],
    ["conduct", "进行；行为；指挥", "The team conducted a survey among students."],
    ["confirm", "确认；证实", "The results confirm our earlier prediction."],
    ["conflict", "冲突；矛盾", "The story is built around a conflict between duty and desire."],
    ["confuse", "使困惑；混淆", "Do not confuse the two similar words."],
    ["connect", "连接；联系", "Connect each cause with its effect."],
    ["consequence", "后果；结果", "Every choice has a consequence."],
    ["consider", "考虑；认为", "Consider the opposite view before you decide."],
    ["constant", "持续的；常数", "Practice requires constant attention and feedback."],
    ["contain", "包含；容纳", "The passage contains several key arguments."],
    ["context", "语境；背景", "Guess the meaning from the context."],
    ["contribute", "贡献；促成", "Small daily actions can contribute to success."],
    ["control", "控制；对照", "Keep the other variables under control."],
    ["convenient", "方便的", "Online resources make review more convenient."],
    ["convince", "说服；使相信", "The evidence convinced us to change our plan."],
    ["cooperate", "合作", "The two groups cooperated on the project."],
    ["create", "创造；造成", "A good question can create deeper discussion."],
    ["critical", "批判性的；关键的", "Critical thinking means examining evidence carefully."],
    ["culture", "文化", "Food is an important part of local culture."],
    ["curious", "好奇的", "Curious learners ask better questions."],
    ["decline", "下降；拒绝", "The number of errors declined after practice."],
    ["define", "定义；界定", "Define the key term before using it."],
    ["demand", "需求；要求", "The job demands patience and accuracy."],
    ["demonstrate", "证明；演示", "The experiment demonstrates the effect of light."],
    ["depend", "依靠；取决于", "The result depends on the quality of the data."],
    ["differ", "不同；相异", "The two methods differ in efficiency."],
    ["discover", "发现", "Scientists discovered a new species."],
    ["distinguish", "区分；辨别", "Learn to distinguish facts from opinions."],
    ["effort", "努力", "Consistent effort matters more than a single burst."],
    ["emerge", "出现；显现", "A clear pattern emerged from the data."],
    ["emphasize", "强调", "The author emphasizes the value of cooperation."],
    ["enable", "使能够", "Practice enables you to respond more quickly."],
    ["engage", "参与；吸引", "Students engage more deeply when they ask questions."],
    ["enhance", "增强；提高", "Review at intervals can enhance memory."],
    ["ensure", "确保", "Check your work to ensure accuracy."],
    ["establish", "建立；证实", "The school established a new reading program."],
    ["estimate", "估计", "Estimate how much time each task will take."],
    ["evidence", "证据", "The conclusion needs stronger evidence."],
    ["exchange", "交换；交流", "The two classes exchanged ideas online."],
    ["expand", "扩展；膨胀", "Reading widely can expand your vocabulary."],
    ["explore", "探索；研究", "The article explores the causes of the phenomenon."],
    ["express", "表达；快速的", "A diagram can express relationships clearly."],
    ["factor", "因素；因子", "Sleep is an important factor in memory."],
    ["familiar", "熟悉的", "The example makes the abstract idea familiar."],
    ["feature", "特征；以……为特点", "The map features six connected subject areas."],
    ["flexible", "灵活的", "A flexible plan is easier to follow."],
    ["focus", "专注；焦点", "Focus on one point at a time."],
    ["frequent", "频繁的", "Frequent short reviews often work better than cramming."],
    ["function", "功能；运作", "The app functions without an internet connection."],
    ["generate", "产生；生成", "The model can generate a study plan."],
    ["gradual", "逐渐的", "Progress is often gradual and uneven."],
    ["guarantee", "保证；担保", "No plan can guarantee a perfect result."],
    ["identify", "识别；确定", "Identify the main idea of the paragraph."],
    ["impact", "影响；冲击", "Small habits can have a lasting impact."],
    ["improve", "改善；提高", "Reflection helps improve your method."],
    ["include", "包括", "The plan includes time for review."],
    ["increase", "增加", "Regular practice increases confidence."],
    ["indicate", "表明；指出", "The results indicate a clear improvement."],
    ["influence", "影响", "Friends can influence our choices."],
    ["interpret", "解释；理解", "Learn to interpret charts accurately."],
    ["introduce", "介绍；引入", "The passage introduces a new perspective."],
    ["maintain", "保持；维护", "Maintain a steady study rhythm."],
    ["measure", "测量；措施", "Measure progress with specific evidence."],
    ["method", "方法", "Active recall is an effective learning method."],
    ["observe", "观察；遵守", "Observe the changes carefully during the experiment."],
    ["occur", "发生；出现", "Most errors occur when students rush."],
    ["opportunity", "机会", "Mistakes are an opportunity to improve."],
    ["organize", "组织；整理", "Organize notes by topic and error type."],
    ["participate", "参加；参与", "Everyone participated in the discussion."],
    ["particular", "特定的；特别的", "Pay attention to this particular detail."],
    ["perform", "执行；表现；表演", "Students performed better after regular review."],
    ["potential", "潜在的；潜力", "Every learner has potential for growth."],
    ["predict", "预测", "Use the evidence to predict the outcome."],
    ["prevent", "阻止；预防", "Planning can prevent last-minute stress."],
    ["process", "过程；处理", "Learning is an active process."],
    ["progress", "进步；进展", "Track progress with small measurable steps."],
    ["purpose", "目的", "The purpose of the question is to test inference."],
    ["reduce", "减少", "Spacing practice can reduce forgetting."],
    ["reflect", "反映；反思", "Reflect on why an answer was wrong."],
    ["require", "需要；要求", "The task requires both speed and accuracy."],
    ["respond", "回应；反应", "Respond to feedback with a specific action."],
    ["result", "结果；导致", "The result supports the hypothesis."],
    ["reveal", "揭示；显示", "The graph reveals a sharp increase."],
    ["significant", "重要的；显著的", "There was a significant improvement in accuracy."],
    ["similar", "相似的", "The two graphs are similar in shape."],
    ["solution", "解决方案；溶液", "Try a different solution when one method fails."],
    ["specific", "具体的；特定的", "Set a specific goal for each session."],
    ["strategy", "策略", "A review strategy should adapt to your progress."],
    ["support", "支持；证据支持", "The evidence supports the author's claim."],
    ["survive", "生存；幸存", "Some organisms survive in extreme conditions."],
    ["tend", "倾向于", "People tend to forget information without review."],
    ["theory", "理论", "The theory must be tested against evidence."],
    ["transform", "转变；改造", "Reflection can transform experience into knowledge."],
    ["typical", "典型的", "This is a typical error in translation."],
    ["understand", "理解", "Explain the idea in your own words to check understanding."],
    ["variety", "多样性；种类", "Use a variety of examples to practice."],
    ["vary", "变化；不同", "Study times vary from person to person."]
  ].map(([word, meaning, sentence], index) => ({
    id: `core-${String(index + 1).padStart(3, "0")}`,
    word,
    meaning,
    sentence,
    builtIn: true
  }));

  const allLeafs = subjects.flatMap((subject) =>
    subject.modules.flatMap((module) =>
      module.leafs.map((item) => ({
        ...item,
        subjectId: subject.id,
        moduleId: module.id
      }))
    )
  );

  window.GAO_DATA = {
    REVIEW_INTERVALS,
    subjects,
    allLeafs,
    vocabSeed,
    vocabTarget: 3500,
    version: "1.0.0"
  };
})();
