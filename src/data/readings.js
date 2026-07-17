/**
 * 阅读理解文章数据
 *
 * 每篇文章关联一个单元，用该单元的单词编写。
 * 后续可通过 DeepSeek API 自动生成更多文章。
 *
 * 题目类型：
 * - choice: 单选题，answer 为正确选项索引
 * - tf: 判断题，answer 为 true/false
 */
export default [
  // ==================== 第1单元 ====================
  {
    id: 1,
    unitId: 1,
    title: "The Power of Evidence in Scientific Breakthroughs",
    source: "Science & Society",
    words: ["firm", "pressure", "climate", "evidence", "breakthrough", "conservative",
            "valuable", "protect", "literature", "senior", "activity", "ability",
            "freedom", "confirm", "target", "imagine", "accept", "defeat"],
    passage: `Scientists work in a high-pressure environment where every discovery must be backed by solid evidence. At a leading research firm in London, senior scientist Dr. Elena Morris and her team recently made a major breakthrough in climate research.

For years, conservative voices in the scientific community were skeptical about the relation between human activity and rapid climate change. "We cannot accept a theory without firm proof," said one critic. But Dr. Morris valued the freedom to explore new ideas. She believed that scientific literature on climate patterns held valuable clues.

The breakthrough came when her team discovered evidence of dramatic climate shifts preserved in ancient ice. "We can now confirm that the current rate of change has no parallel in nature," Dr. Morris explained. "This evidence gives us the ability to predict future patterns with greater accuracy."

Their research has become a valuable target for environmental groups working to protect our planet. "We need to imagine a better future and take action," said one senior member of the team. "This is not a defeat for industry — it is a victory for science."

The team's findings have decorated the covers of major scientific journals, and congratulations poured in from around the world. Their work proves that when scientists have the freedom to follow evidence wherever it leads, real breakthroughs are possible.`,
    questions: [
      {
        id: 1,
        type: "choice",
        question: "What was the main breakthrough made by Dr. Morris's team?",
        options: [
          "A. They found a new species of animal in the Arctic.",
          "B. They discovered evidence of climate shifts in ancient ice.",
          "C. They invented a new type of renewable energy.",
          "D. They proved that climate change is not real."
        ],
        answer: 1,
        explanation: "The passage states: 'The breakthrough came when her team discovered evidence of dramatic climate shifts preserved in ancient ice.'"
      },
      {
        id: 2,
        type: "choice",
        question: "Why were some scientists initially skeptical of Dr. Morris's research?",
        options: [
          "A. They did not have enough funding.",
          "B. They wanted to protect their own research.",
          "C. They had conservative views and wanted firm proof.",
          "D. They did not understand English literature."
        ],
        answer: 2,
        explanation: "The passage mentions 'conservative voices in the scientific community were skeptical' and 'we cannot accept a theory without firm proof.'"
      },
      {
        id: 3,
        type: "choice",
        question: "According to the passage, what does the evidence give scientists the ability to do?",
        options: [
          "A. Decorate scientific journals.",
          "B. Organize more meetings.",
          "C. Predict future climate patterns more accurately.",
          "D. Defeat other research teams."
        ],
        answer: 2,
        explanation: "Dr. Morris says: 'This evidence gives us the ability to predict future patterns with greater accuracy.'"
      },
      {
        id: 4,
        type: "tf",
        question: "Dr. Morris's research proved that climate change is not related to human activity.",
        answer: false,
        explanation: "The passage says the team found evidence of climate shifts, and they wanted to protect the planet. It does not disprove the connection to human activity."
      },
      {
        id: 5,
        type: "tf",
        question: "Environmental groups consider the research to be a valuable target for their work.",
        answer: true,
        explanation: "The passage explicitly states: 'Their research has become a valuable target for environmental groups working to protect our planet.'"
      }
    ]
  },

  // ==================== 第2单元（用第1单元单词的延伸主题） ====================
  {
    id: 2,
    unitId: 2,
    title: "A New Diet for a Busy Life",
    source: "Health & Lifestyle",
    words: ["diet", "busy", "lonely", "stupid", "wage", "grey", "slip", "relay", "organise", "decorate", "member", "left"],
    passage: `For many busy professionals, maintaining a healthy diet can feel like an impossible relay race. You finish one task, and another immediately begins — there is never time left to prepare proper meals.

Sarah, a 34-year-old marketing manager, knows this feeling well. "I used to eat fast food every day," she admits. "It was a stupid habit, but with my busy schedule, cooking felt like too much work." She felt lonely in her struggle, watching colleagues slip into the same unhealthy patterns.

Things changed when Sarah became a member of a local health club. "The first thing I learned was to organise my meals in advance," she explains. "On grey Sunday afternoons, I prepare food for the entire week. It's like decorating — you're making something beautiful and healthy."

Sarah also discovered the importance of a balanced diet. "I don't believe in extreme diets that cut out entire food groups. That's just stupid." Instead, she focuses on variety and moderation. Her grocery wage now goes much further, as she buys fresh ingredients instead of expensive processed foods.

"Don't let your busy life become an excuse," Sarah advises. "If I can slip into healthy habits, anyone can. The key is to organise, prepare, and remember that your health is the most valuable thing you own."`,
    questions: [
      {
        id: 1,
        type: "choice",
        question: "What was Sarah's main problem before joining the health club?",
        options: [
          "A. She earned too low a wage to buy food.",
          "B. She was too busy to cook healthy meals.",
          "C. She didn't like the taste of vegetables.",
          "D. She was allergic to most foods."
        ],
        answer: 1,
        explanation: "The passage states: 'with my busy schedule, cooking felt like too much work' and she used to eat fast food."
      },
      {
        id: 2,
        type: "choice",
        question: "How did Sarah solve her diet problem?",
        options: [
          "A. She hired a personal chef.",
          "B. She stopped eating lunch.",
          "C. She organised her meals in advance on Sundays.",
          "D. She only ate at restaurants."
        ],
        answer: 2,
        explanation: "Sarah says: 'On grey Sunday afternoons, I prepare food for the entire week.'"
      },
      {
        id: 3,
        type: "choice",
        question: "What does Sarah think about extreme diets?",
        options: [
          "A. They are the best way to lose weight.",
          "B. They are stupid.",
          "C. They are necessary for everyone.",
          "D. They are too expensive."
        ],
        answer: 1,
        explanation: "Sarah says: 'I don't believe in extreme diets that cut out entire food groups. That's just stupid.'"
      },
      {
        id: 4,
        type: "tf",
        question: "Sarah prepares her weekly meals on Saturday mornings.",
        answer: false,
        explanation: "The passage says she prepares food 'On grey Sunday afternoons,' not Saturday."
      },
      {
        id: 5,
        type: "tf",
        question: "Becoming a member of a health club helped Sarah change her habits.",
        answer: true,
        explanation: "The passage states: 'Things changed when Sarah became a member of a local health club.'"
      }
    ]
  },

  // ==================== 第3单元：科技与创新 ====================
  {
    id: 3,
    unitId: 3,
    title: "How Technology Reshapes Our Daily Communication",
    source: "Tech & Society",
    words: ["technology", "communicate", "digital", "device", "information", "network",
            "connect", "modern", "system", "design", "create", "project"],
    passage: `In the modern world, technology has fundamentally changed how we communicate. From smartphones to social networks, digital devices have created a connected society where information flows faster than ever before.

Professor James Chen, who leads a research project on digital communication at Stanford University, believes we are living through a historic shift. "The way people communicate today is completely different from just twenty years ago," he explains. "We now have the ability to connect with anyone, anywhere, at any time."

The digital revolution has brought both benefits and challenges. On one hand, modern communication systems make it easier to maintain relationships across long distances. Families separated by oceans can share moments instantly through video calls. Businesses can coordinate projects across continents. Students can access educational resources from the world's best institutions without leaving their homes.

However, Professor Chen warns that constant connectivity comes at a price. "People often feel pressure to respond immediately to every message," he notes. "We need to design a healthier relationship with our devices. The technology itself is neutral — it is how we choose to use it that matters."

The research team is now working on a new project to help people develop better digital habits. "Our goal is not to reject technology," says Chen, "but to create systems that support human well-being rather than undermine it."`,
    questions: [
      {
        id: 1,
        type: "choice",
        question: "What is the main topic of this passage?",
        options: [
          "A. The history of telephone communication.",
          "B. How technology has changed the way people communicate.",
          "C. The dangers of social media addiction.",
          "D. How to design better smartphone hardware."
        ],
        answer: 1,
        explanation: "The passage focuses on how 'technology has fundamentally changed how we communicate' and discusses both benefits and challenges."
      },
      {
        id: 2,
        type: "choice",
        question: "According to Professor Chen, what is a negative effect of modern communication?",
        options: [
          "A. People travel less frequently.",
          "B. People feel pressure to respond immediately to messages.",
          "C. Businesses cannot coordinate internationally.",
          "D. Students have fewer educational resources."
        ],
        answer: 1,
        explanation: "Prof. Chen warns that 'People often feel pressure to respond immediately to every message.'"
      },
      {
        id: 3,
        type: "choice",
        question: "What is the research team currently working on?",
        options: [
          "A. A faster internet connection system.",
          "B. A project to help people develop better digital habits.",
          "C. A new social media platform for students.",
          "D. A device that blocks all digital communication."
        ],
        answer: 1,
        explanation: "The passage states: 'The research team is now working on a new project to help people develop better digital habits.'"
      },
      {
        id: 4,
        type: "tf",
        question: "Professor Chen believes that technology itself is harmful.",
        answer: false,
        explanation: "Chen says 'The technology itself is neutral — it is how we choose to use it that matters.'"
      },
      {
        id: 5,
        type: "tf",
        question: "Modern communication systems have made it easier to maintain long-distance relationships.",
        answer: true,
        explanation: "The passage states: 'modern communication systems make it easier to maintain relationships across long distances.'"
      }
    ]
  },

  // ==================== 第4单元：教育与成长 ====================
  {
    id: 4,
    unitId: 4,
    title: "The Value of Failure in Education",
    source: "Education Weekly",
    words: ["education", "failure", "success", "learn", "experience", "challenge",
            "opportunity", "growth", "attitude", "achieve", "goal", "support"],
    passage: `For generations, education systems around the world have taught students that failure is something to be avoided at all costs. But a growing number of educators now argue that failure is not the opposite of success — it is an essential part of the learning process.

Dr. Maria Santos, an education researcher at the University of Barcelona, has spent years studying how students respond to challenges. "When students are never allowed to fail, they never develop the skills to overcome difficulties," she explains. "Failure teaches us what doesn't work, which is often more valuable than being told what does."

Her research shows that students who are encouraged to view failure as a learning opportunity tend to achieve higher levels of success in the long term. These students develop a growth attitude — the belief that abilities can be improved through effort and experience. In contrast, students who fear failure often avoid taking on new challenges, limiting their potential.

"We need to change the way we talk about failure in schools," says Dr. Santos. "Instead of asking 'Did you get the right answer?', we should ask 'What did you learn from this experience?' This simple shift in attitude can transform a student's entire educational journey."

The challenge for educators is to create environments where students feel safe to take risks. This requires support from teachers, parents, and the broader community. "When students know they will be supported regardless of the outcome," Dr. Santos concludes, "they are more willing to push beyond their comfort zone and achieve goals they never thought possible."`,
    questions: [
      {
        id: 1,
        type: "choice",
        question: "What is Dr. Santos's main argument about failure?",
        options: [
          "A. Failure should be avoided in all educational settings.",
          "B. Failure is an essential part of the learning process.",
          "C. Students who fail should repeat their courses.",
          "D. Failure only affects students with bad attitudes."
        ],
        answer: 1,
        explanation: "Dr. Santos argues that 'failure is not the opposite of success — it is an essential part of the learning process.'"
      },
      {
        id: 2,
        type: "choice",
        question: "What is a 'growth attitude' according to the passage?",
        options: [
          "A. The belief that abilities are fixed and cannot change.",
          "B. The belief that success comes only from luck.",
          "C. The belief that abilities can be improved through effort.",
          "D. The belief that failure should be celebrated without learning from it."
        ],
        answer: 2,
        explanation: "The passage defines growth attitude as 'the belief that abilities can be improved through effort and experience.'"
      },
      {
        id: 3,
        type: "choice",
        question: "What question does Dr. Santos suggest teachers should ask instead of 'Did you get the right answer?'",
        options: [
          "A. 'Why did you fail again?'",
          "B. 'What did you learn from this experience?'",
          "C. 'Who helped you with this?'",
          "D. 'When will you try harder?'"
        ],
        answer: 1,
        explanation: "Dr. Santos says: 'Instead of asking Did you get the right answer?, we should ask What did you learn from this experience?'"
      },
      {
        id: 4,
        type: "tf",
        question: "Students who fear failure are more likely to take on new challenges.",
        answer: false,
        explanation: "The passage states the opposite: 'students who fear failure often avoid taking on new challenges, limiting their potential.'"
      },
      {
        id: 5,
        type: "tf",
        question: "According to the passage, creating a safe environment for students requires support from teachers, parents, and the community.",
        answer: true,
        explanation: "The passage states: 'This requires support from teachers, parents, and the broader community.'"
      }
    ]
  },

  // ==================== 第5单元：旅行与文化理解 ====================
  {
    id: 5,
    unitId: 5,
    title: "Travel as a Bridge Between Cultures",
    source: "World Explorer",
    words: ["culture", "travel", "foreign", "experience", "understand", "tradition",
            "local", "exchange", "global", "perspective", "journey", "discover"],
    passage: `Travel has long been celebrated as one of the best forms of education. When we step outside our familiar environment and immerse ourselves in a foreign culture, we gain something that no textbook can provide: direct experience of how other people live, think, and see the world.

Anna Larsson, a Swedish photographer who has visited over sixty countries, believes that travel is the ultimate bridge between cultures. "When you sit down and share a meal with a local family in a small village in Vietnam or Peru," she says, "you begin to understand that despite our different traditions and languages, we share the same fundamental hopes and dreams."

Cultural exchange programs have become increasingly popular as the world becomes more interconnected. Thousands of students each year participate in study-abroad programs, living with host families and attending local schools. These experiences shape their global perspective in ways that classroom learning alone cannot achieve.

"The most important thing I've learned from my journeys," Anna reflects, "is that understanding another culture doesn't mean you have to agree with everything about it. It means you develop the ability to see the world from multiple perspectives. That skill is invaluable in today's global society."

She encourages young people to discover the world beyond their borders. "You don't need to travel far or spend a lot of money. Sometimes the most meaningful cultural exchanges happen in your own neighborhood, when you take the time to talk to someone whose life experience is different from your own."`,
    questions: [
      {
        id: 1,
        type: "choice",
        question: "What does Anna Larsson believe travel can achieve?",
        options: [
          "A. It is the best way to make money.",
          "B. It can serve as a bridge between cultures.",
          "C. It is more important than formal education.",
          "D. It helps people forget their own culture."
        ],
        answer: 1,
        explanation: "The passage states: 'Anna Larsson... believes that travel is the ultimate bridge between cultures.'"
      },
      {
        id: 2,
        type: "choice",
        question: "According to the passage, what happens when you share a meal with a local family abroad?",
        options: [
          "A. You realize how different and incompatible cultures are.",
          "B. You learn to cook foreign dishes.",
          "C. You understand that people share fundamental hopes and dreams.",
          "D. You become fluent in their language."
        ],
        answer: 2,
        explanation: "Anna says: 'you begin to understand that despite our different traditions and languages, we share the same fundamental hopes and dreams.'"
      },
      {
        id: 3,
        type: "choice",
        question: "What does Anna say about understanding another culture?",
        options: [
          "A. It requires agreeing with everything about that culture.",
          "B. It means developing the ability to see from multiple perspectives.",
          "C. It is impossible without spending years abroad.",
          "D. It is less important than understanding your own culture."
        ],
        answer: 1,
        explanation: "Anna says: 'understanding another culture doesn't mean you have to agree with everything about it. It means you develop the ability to see the world from multiple perspectives.'"
      },
      {
        id: 4,
        type: "tf",
        question: "According to Anna, you must travel far and spend a lot of money to experience cultural exchange.",
        answer: false,
        explanation: "Anna says exactly the opposite: 'You don't need to travel far or spend a lot of money.'"
      },
      {
        id: 5,
        type: "tf",
        question: "Thousands of students participate in study-abroad programs each year.",
        answer: true,
        explanation: "The passage states: 'Thousands of students each year participate in study-abroad programs.'"
      }
    ]
  },

  // ==================== 第6单元：环境保护与可持续发展 ====================
  {
    id: 6,
    unitId: 6,
    title: "Small Actions, Big Impact: The Rise of Individual Environmental Action",
    source: "Green Planet",
    words: ["environment", "protect", "action", "individual", "community", "reduce",
            "resource", "sustainable", "future", "responsibility", "change", "solution"],
    passage: `When it comes to environmental protection, many people feel that individual actions are too small to make a difference. But a growing movement of environmental activists argues that collective individual action is exactly what the planet needs.

"The idea that one person can't make a difference is the biggest obstacle we face," says David Okonkwo, founder of the Green Communities Network in Kenya. "Every sustainable future starts with individual choices. When millions of people make small changes — reducing plastic use, conserving water, choosing sustainable products — the impact is enormous."

David's organization has helped over 200 communities across East Africa develop local environmental solutions. From tree-planting initiatives to waste reduction programs, these community-led projects demonstrate that meaningful change starts at the grassroots level.

"The most effective environmental action happens when individuals feel a sense of personal responsibility," David explains. "When people understand that protecting the environment is not someone else's job, they become powerful agents of change."

His advice for those who want to help but don't know where to start is simple: "Begin with one small change. Bring your own bag to the market. Walk instead of drive for short trips. Talk to your neighbors about protecting local green spaces. Each action may seem small, but together they create a wave of change that no government or corporation can ignore."

The message is clear: the future of our planet depends not on a few grand solutions, but on billions of small, sustainable actions taken by individuals every day.`,
    questions: [
      {
        id: 1,
        type: "choice",
        question: "What is the main message of this passage?",
        options: [
          "A. Only governments can solve environmental problems.",
          "B. Individual actions collectively make a big environmental impact.",
          "C. Environmental protection is too expensive for individuals.",
          "D. Plastic use is the only environmental issue that matters."
        ],
        answer: 1,
        explanation: "The passage's central message is that 'collective individual action is exactly what the planet needs' and 'every sustainable future starts with individual choices.'"
      },
      {
        id: 2,
        type: "choice",
        question: "How many communities has the Green Communities Network helped?",
        options: [
          "A. Less than 50.",
          "B. About 100.",
          "C. Over 200.",
          "D. More than 500."
        ],
        answer: 2,
        explanation: "The passage states: 'David's organization has helped over 200 communities across East Africa.'"
      },
      {
        id: 3,
        type: "choice",
        question: "What does David recommend as a first step for people who want to help the environment?",
        options: [
          "A. Move to a different country.",
          "B. Write a letter to the government.",
          "C. Start with one small change, like bringing your own bag.",
          "D. Organize a large protest immediately."
        ],
        answer: 2,
        explanation: "David advises: 'Begin with one small change. Bring your own bag to the market.'"
      },
      {
        id: 4,
        type: "tf",
        question: "David Okonkwo believes that protecting the environment is only the government's responsibility.",
        answer: false,
        explanation: "David says: 'When people understand that protecting the environment is not someone else's job, they become powerful agents of change.'"
      },
      {
        id: 5,
        type: "tf",
        question: "The Green Communities Network operates in East Africa.",
        answer: true,
        explanation: "The passage states that David founded the 'Green Communities Network in Kenya' which helped 'over 200 communities across East Africa.'"
      }
    ]
  }
]
