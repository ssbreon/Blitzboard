// Field coordinates are percentages: x = 0 (left) to 100 (right), y = 0 (top) to 100 (bottom).
const PLAY_TEMPLATE_DEFINITIONS = [
  // 1) Pro Set vs 4-3 Over
  {
    id: '11v11-pro-set-vs-4-3-over',
    legacyIds: ['11v11'],
    label: 'Pro Set vs 4-3 Over',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line: LT, LG, C, RG, RT (rendered y = 85 - pos.y, so a smaller
      // pos.y here means closer to the line of scrimmage)
      { x: 46, y: 50 },  //RT 
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT
      // Tight end
      { x: 44, y: 50 },  //TE
      // Split end / flanker
      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker
      // Quarterback
      { x: 50, y: 59 },  //Quarterback
      // Halfback / fullback (pro set split backs)
      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      // Down linemen: DE, DT, DT, DE (DE over LT/RT, DT over LG/RG; just below the line of scrimmage)
      { x: 44, y: 40 },     // DE over LT
      { x: 47.5, y: 40 },   // T (3-tech)
      { x: 50.5, y: 40 },   // T (1-tech)
      { x: 54.5, y: 40 },   // DE over RT

      // Linebackers: WLB, MLB, SLB
      { x: 45.5, y: 49 }, // SLB
      { x: 50, y: 50 }, // MLB
      { x: 54.5, y: 49 }, // WLB
      // Cornerbacks
      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)
      // Safeties
      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FF (free safety)
    ],
  },
  // 2) Pro Set vs 4-3 Under
  {
    id: '11v11-pro-set-vs-4-3-under',
    legacyIds: [],
    label: 'Pro Set vs 4-3 Under',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 45.5, y: 40 }, // DE (weak)
      { x: 49.5, y: 40 }, // T (1-tech)
      { x: 52.5, y: 40 }, // T (3-tech)
      { x: 55, y: 40 },  // DE (strong)

      { x: 43, y: 41 }, // SLB
      { x: 48, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
    // 3) Pro Set vs 4-2 Nickel
  {
    id: '11v11-pro-set-vs-4-2-nickel',
    legacyIds: [],
    label: 'Pro Set vs 4-2 Nickel',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'N', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 44.5, y: 40 },   // DE (weak)
      { x: 47.5, y: 40 }, // T (3-tech)
      { x: 50.5, y: 40 }, // T (1-tech)
      { x: 54.5, y: 40 }, // DE (strong)

      { x: 43, y: 49 }, // Nickel
      { x: 49, y: 49 }, // MLB
      { x: 54, y: 49 }, // WLB

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 4) Pro Set vs 3-4 Base
  {
    id: '11v11-pro-set-vs-3-4-base',
    legacyIds: [],
    label: 'Pro Set vs 3-4 Base',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 45.5, y: 40 }, // DE (weak)
      { x: 50, y: 40 }, // NT
      { x: 54.5, y: 40 }, // DE (strong)

      { x: 43, y: 41 }, // SLB
      { x: 48, y: 49 }, // MLB
      { x: 52, y: 49 }, // WLB
      { x: 57, y: 43 }, // Jack

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 5) Pro Set vs 3-4 Tite
  {
    id: '11v11-pro-set-vs-tite',
    legacyIds: [],
    label: 'Pro Set vs 3-4 Tite',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 46.5, y: 40 }, // DE (4i weak)
      { x: 50, y: 40 }, // NT (0-tech)
      { x: 53.5, y: 40 }, // DE (4i strong)

      { x: 43, y: 41 }, // SLB
      { x: 47, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB
      { x: 57, y: 43 }, // Jack

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 6) Pro Set vs 3-3 Stack
  {
    id: '11v11-pro-set-vs-3-3-stack',
    legacyIds: [],
    label: 'Pro Set vs 3-3 Stack',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'SS', 'S', 'M', 'W', 'WS', 'C', 'FS', 'C'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 46.5, y: 40 }, // DE (weak)
      { x: 50, y: 40 },   // NT
      { x: 54, y: 40 },   // DE (strong)

      { x: 42, y: 44 }, // SS (strong safety)
      { x: 46, y: 49 }, // SLB
      { x: 50, y: 50 }, // MLB
      { x: 54, y: 49 }, // WLB
      { x: 58, y: 44 }, // WS (weak safety)

      { x: 18, y: 54 }, // CB (left)
      { x: 50, y: 67 }, // FS (free safety)
      { x: 82, y: 54 }, // CB (right)
    ],
  },
  // 7) Pro Set vs Bear
  {
    id: '11v11-pro-set-vs-bear',
    legacyIds: [],
    label: 'Pro Set vs Bear',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'FS', 'C'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 42, y: 40 }, // DE (weak)
      { x: 47.5, y: 40 }, // T (weak 3-tech)
      { x: 50, y: 40 }, // NT
      { x: 52.5, y: 40 }, // T (strong 3-tech)
      { x: 55, y: 40 }, // DE (strong)

      { x: 44.5, y: 40 }, // SLB
      { x: 47, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB

      { x: 18, y: 54 }, // CB (left)
      { x: 50, y: 67 }, // FS (free safety)
      { x: 82, y: 54 }, // CB (right)
    ],
  },
  // 8) Pro Set vs 5-2
  {
    id: '11v11-pro-set-vs-5-2',
    legacyIds: [],
    label: 'Pro Set vs 5-2',
    gameType: '11v11',
    formationFamily: 'pro_set',
    formationFamilyLabel: 'Pro Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      { x: 50, y: 59 },  //Quarterback

      { x: 54, y: 63 },  //Halfback
      { x: 46, y: 63 },  //Fullback
    ],
    defense: [
      { x: 46, y: 40 }, // DE (weak)
      { x: 50, y: 40 }, // NT
      { x: 54, y: 40 }, // DE (strong)

      { x: 43, y: 40 }, // SLB (on LOS)
      { x: 48, y: 49 }, // MLB
      { x: 52, y: 49 }, // WLB
      { x: 57, y: 40 }, // Jack (strong edge)

      { x: 18, y: 53 }, // CB (left)
      { x: 82, y: 53 }, // CB (right)
      { x: 35, y: 62 }, // SS (strong safety)
      { x: 65, y: 62 }, // FS (free safety)
    ],
  },
  // 1) Pro-I Set vs 4-3 Over
  {
    id: '11v11-pro-i-set-vs-4-3-over',
    legacyIds: [],
    label: 'Pro-I Set vs 4-3 Over',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line: LT, LG, C, RG, RT (rendered y = 85 - pos.y, so a smaller
      // pos.y here means closer to the line of scrimmage)
      { x: 46, y: 50 },  //RT 
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT
      // Tight end
      { x: 44, y: 50 },  //TE
      // Split end / flanker
      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker
      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      // Down linemen: DE, DT, DT, DE (DE over LT/RT, DT over LG/RG; just below the line of scrimmage)
      { x: 44, y: 40 },     // DE over LT
      { x: 47.5, y: 40 },   // T (3-tech)
      { x: 50.5, y: 40 },   // T (1-tech)
      { x: 54.5, y: 40 },   // DE over RT

      // Linebackers: WLB, MLB, SLB
      { x: 45.5, y: 49 }, // SLB
      { x: 50, y: 50 }, // MLB
      { x: 54.5, y: 49 }, // WLB
      // Cornerbacks
      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)
      // Safeties
      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FF (free safety)
    ],
  },
  // 2) Pro-I Set vs 4-3 Under
  {
    id: '11v11-pro-i-set-vs-4-3-under',
    legacyIds: [],
    label: 'Pro-I Set vs 4-3 Under',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback

    ],
    defense: [
      { x: 45.5, y: 40 }, // DE (weak)
      { x: 49.5, y: 40 }, // T (1-tech)
      { x: 52.5, y: 40 }, // T (3-tech)
      { x: 55, y: 40 },  // DE (strong)

      { x: 43, y: 41 }, // SLB
      { x: 48, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
    // 3) Pro-I Set vs 4-2 Nickel
  {
    id: '11v11-pro-i-set-vs-4-2-nickel',
    legacyIds: [],
    label: 'Pro-I Set vs 4-2 Nickel',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'N', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      { x: 44.5, y: 40 },   // DE (weak)
      { x: 47.5, y: 40 }, // T (3-tech)
      { x: 50.5, y: 40 }, // T (1-tech)
      { x: 54.5, y: 40 }, // DE (strong)

      { x: 43, y: 49 }, // Nickel
      { x: 49, y: 49 }, // MLB
      { x: 54, y: 49 }, // WLB

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 4) Pro-I Set vs 3-4 Base
  {
    id: '11v11-pro-i-set-vs-3-4-base',
    legacyIds: [],
    label: 'Pro-I Set vs 3-4 Base',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      { x: 45.5, y: 40 }, // DE (weak)
      { x: 50, y: 40 }, // NT
      { x: 54.5, y: 40 }, // DE (strong)

      { x: 43, y: 41 }, // SLB
      { x: 48, y: 49 }, // MLB
      { x: 52, y: 49 }, // WLB
      { x: 57, y: 43 }, // Jack

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 5) Pro-I Set vs 3-4 Tite
  {
    id: '11v11-pro-i-set-vs-tite',
    legacyIds: [],
    label: 'Pro-I Set vs 3-4 Tite',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      { x: 46.5, y: 40 }, // DE (4i weak)
      { x: 50, y: 40 }, // NT (0-tech)
      { x: 53.5, y: 40 }, // DE (4i strong)

      { x: 43, y: 41 }, // SLB
      { x: 47, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB
      { x: 57, y: 43 }, // Jack

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 6) Pro-I Set vs 3-3 Stack
  {
    id: '11v11-pro-i-set-vs-3-3-stack',
    legacyIds: [],
    label: 'Pro-I Set vs 3-3 Stack',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'SS', 'S', 'M', 'W', 'WS', 'C', 'FS', 'C'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      { x: 46.5, y: 40 }, // DE (weak)
      { x: 50, y: 40 },   // NT
      { x: 54, y: 40 },   // DE (strong)

      { x: 42, y: 44 }, // SS (strong safety)
      { x: 46, y: 49 }, // SLB
      { x: 50, y: 50 }, // MLB
      { x: 54, y: 49 }, // WLB
      { x: 58, y: 44 }, // WS (weak safety)

      { x: 18, y: 54 }, // CB (left)
      { x: 50, y: 67 }, // FS (free safety)
      { x: 82, y: 54 }, // CB (right)
    ],
  },
  // 7) Pro-I Set vs Bear
  {
    id: '11v11-pro-i-set-vs-bear',
    legacyIds: [],
    label: 'Pro-I Set vs Bear',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'FS', 'C'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      { x: 42, y: 40 }, // DE (weak)
      { x: 47.5, y: 40 }, // T (weak 3-tech)
      { x: 50, y: 40 }, // NT
      { x: 52.5, y: 40 }, // T (strong 3-tech)
      { x: 55, y: 40 }, // DE (strong)

      { x: 44.5, y: 40 }, // SLB
      { x: 47, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB

      { x: 18, y: 54 }, // CB (left)
      { x: 50, y: 67 }, // FS (free safety)
      { x: 82, y: 54 }, // CB (right)
    ],
  },
  // 8) Pro-I Set vs 5-2
  {
    id: '11v11-pro-i-set-vs-5-2',
    legacyIds: [],
    label: 'Pro-I Set vs 5-2',
    gameType: '11v11',
    formationFamily: 'pro_i_set',
    formationFamilyLabel: 'Pro-I Set',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      { x: 44, y: 50 },  //TE

      { x: 17, y: 52 },  //Split end / flanker
      { x: 83, y: 50 },  //Split end / flanker

      // Quarterback
      { x: 50, y: 54 },  //Quarterback
      // Halfback / fullback (pro-I set split backs)
      { x: 50, y: 65 },  //Halfback
      { x: 50, y: 59 },  //Fullback
    ],
    defense: [
      { x: 46, y: 40 }, // DE (weak)
      { x: 50, y: 40 }, // NT
      { x: 54, y: 40 }, // DE (strong)

      { x: 43, y: 40 }, // SLB (on LOS)
      { x: 48, y: 49 }, // MLB
      { x: 52, y: 49 }, // WLB
      { x: 57, y: 40 }, // Jack (strong edge)

      { x: 18, y: 53 }, // CB (left)
      { x: 82, y: 53 }, // CB (right)
      { x: 35, y: 62 }, // SS (strong safety)
      { x: 65, y: 62 }, // FS (free safety)
    ],
  },  
  // 1) Air Raid vs 4-3 Over
  {
    id: 'air-raid-vs-4-3-over',
    legacyIds: [],
    label: 'Air Raid vs 4-3 Over',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // 4-3 Over: ['E','T','T','E','S','M','W','C','C','SS','FS']
    defense: [
      { x: 45, y: 40 }, // E (left end)
      { x: 47.5, y: 40 }, // T (3-tech)
      { x: 50.5, y: 40 }, // T (1-tech)
      { x: 54.5, y: 40 }, // E (right end)

      { x: 43, y: 49 }, // S (Sam)
      { x: 50, y: 50 }, // M (Mike)
      { x: 57, y: 49 }, // W (Will)

      // CBs outside X and Z
      { x: 11, y: 50 }, // C (left CB outside X)
      { x: 89, y: 50 }, // C (right CB outside Z)

      // Safeties anchored to hashes
      { x: 35, y: 66 }, // SS (strong hash)
      { x: 65, y: 66 }, // FS (weak hash)
    ],
  },
  // 2) Air Raid vs 4-3 Under
  {
    id: 'air-raid-vs-4-3-under',
    legacyIds: [],
    label: 'Air Raid vs 4-3 Under',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
      offense: [
        { x: 46, y: 50 }, // RT
        { x: 48, y: 50 }, // RG
        { x: 50, y: 50 }, // C
        { x: 52, y: 50 }, // LG
        { x: 54, y: 50 }, // LT

        { x: 30, y: 52 }, // Y - right slot
        { x: 12, y: 50 }, // Z - right outsidee
        { x: 88, y: 50 }, // X - left outside

        { x: 50, y: 59 }, // Q - QB
        { x: 70, y: 52 }, // H - left slot
        { x: 47, y: 61 }, // F - RB sidecar right
      ],

    // 4-3 Under: ['E','T','T','E','S','M','W','C','C','SS','FS']
    defense: [
      // DL (Under front shading)
      { x: 45.5, y: 40 },   // E (weak end, wider)
      { x: 49.5, y: 40 }, // T (1-tech weak)
      { x: 52.5, y: 40 }, // T (3-tech strong)
      { x: 55,  y: 40 },  // E (strong end, tighter)

      // LBs
      { x: 42, y: 42 }, // S (Sam strong, near Line of Scrimmage)
      { x: 48, y: 49 }, // M (Mike, over guard)
      { x: 53, y: 49 }, // W (Will weak, over guard)

      // CBs outside X and Z
      { x: 11, y: 50 }, // C (left CB outside X)
      { x: 89, y: 50 }, // C (right CB outside Z)

      // Safeties anchored to hashes
      { x: 35, y: 66 }, // SS (strong hash)
      { x: 65, y: 66 }, // FS (weak hash)
    ],
  },

  // 3) Air Raid vs 4-2 Nickel
  {
    id: 'air-raid-vs-4-2-nickel',
    legacyIds: [],
    label: 'Air Raid vs 4-2 Nickel',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'N', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // 4-2 Nickel: ['E','T','T','E','N','M','W','C','C','SS','FS']
    defense: [
      { x: 45, y: 40 }, // E (left end)
      { x: 47.5, y: 40 }, // T (3-tech)
      { x: 50.5, y: 40 }, // T (1-tech)
      { x: 54.5, y: 40 }, // E (right end)

      { x: 32, y: 49 }, // N (nickel over Y slot)
      { x: 49, y: 49 }, // M (Mike, strongside A gap)
      { x: 54, y: 49 }, // W (Will, weakside B gap)

      // CBs outside X and Z
      { x: 11, y: 50 }, // C (left CB outside X)
      { x: 89, y: 50 }, // C (right CB outside Z)

      // Safeties anchored to hashes
      { x: 35, y: 66 }, // SS (strong hash)
      { x: 65, y: 66 }, // FS (weak hash)
    ],
  },

  // 4) Air Raid vs 3-4 Base
  {
    id: 'air-raid-vs-3-4-base',
    legacyIds: [],
    label: 'Air Raid vs 3-4 Base',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // 3-4 Base: ['E','T','E','S','M','W','J','C','SS','FS','C']
    defense: [
      { x: 45.5, y: 40 }, // E (left end)
      { x: 50, y: 40 },   // T (nose)
      { x: 54.5, y: 40 }, // E (right end)

      { x: 42, y: 42 }, // S (Sam, left edge)
      { x: 48, y: 49 }, // M (Mike over guard)
      { x: 52, y: 49 }, // W (Will over guard)
      { x: 58, y: 42 }, // J (Jack, right edge)

      // CBs outside X and Z
      { x: 11, y: 50 }, // C (left CB outside X)
      { x: 89, y: 50 }, // C (right CB outside Z)

      // Safeties anchored to hashes
      { x: 35, y: 66 }, // SS (strong hash)
      { x: 65, y: 66 }, // FS (weak hash)
    ],
  },

  // 5) Air Raid vs 3-4 Tite
  {
    id: 'air-raid-vs-tite',
    legacyIds: [],
    label: 'Air Raid vs 3-4 Tite',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // Tite: ['E','T','E','S','M','W','N','C','SS','FS','C']
    defense: [
      { x: 46.5, y: 40 }, // E (left end 4i-tech)
      { x: 50, y: 40 },   // T (nose)
      { x: 53.5, y: 40 }, // E (right end 4i-tech)

      { x: 42, y: 42 }, // S (Sam, left edge)
      { x: 47, y: 49 }, // M (Mike B gap)
      { x: 53, y: 49 }, // W (Will B gap)
      { x: 58, y: 42 }, // J (Jack, right edge)

      // CBs outside X and Z
      { x: 11, y: 50 }, // C (left CB outside X)
      { x: 89, y: 50 }, // C (right CB outside Z)

      // Safeties anchored to hashes
      { x: 35, y: 66 }, // SS (strong hash)
      { x: 65, y: 66 }, // FS (weak hash)
    ],
  },

  // 6) Air Raid vs 3-3 Stack
  {
    id: 'air-raid-vs-3-3-stack',
    legacyIds: [],
    label: 'Air Raid vs 3-3 Stack',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'SS', 'S', 'M', 'W', 'J', 'C', 'FS', 'C'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // 3-3 Stack: ['E','T','E','SS','S','M','W','J','C','FS','C']
    defense: [
      { x: 46, y: 40 }, // E (left end)
      { x: 50, y: 40 },   // T (nose)
      { x: 54, y: 40 }, // E (right end)

      { x: 31, y: 49 }, // SS (over left/strong slot)
      { x: 46, y: 49 }, // SLB
      { x: 50, y: 50 }, // MLB
      { x: 54, y: 49 }, // WLB
      { x: 69, y: 49 }, // J (Jack, over right/weak slot)

      { x: 13, y: 54 }, // C (left CB)
      { x: 50, y: 67 }, // FS
      { x: 87, y: 54 }, // C (right CB)
    ],
  },
  
  // 7) Air Raid vs Bear
  {
    id: 'air-raid-vs-bear',
    legacyIds: [],
    label: 'Air Raid vs Bear',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'FS', 'C'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // Bear: ['E','T','T','T','E','S','M','W','C','FS','C']
    defense: [
      { x: 45, y: 40 },   // E (5-tech left)
      { x: 47.5, y: 40 }, // T (left 3-tech)
      { x: 50, y: 40 },   // T (0-tech)
      { x: 52.5, y: 40 }, // T (right 3-tech)
      { x: 55, y: 40 },   // E (5-tech right)

      { x: 32, y: 49 }, // S
      { x: 50, y: 49 }, // M
      { x: 68, y: 49 }, // W

      { x: 13, y: 54 }, // C (left CB)
      { x: 50, y: 67 }, // FS
      { x: 87, y: 54 }, // C (right CB)
    ],
  },

  // 8) Air Raid vs 5-2
  {
    id: 'air-raid-vs-5-2',
    legacyIds: [],
    label: 'Air Raid vs 5-2',
    gameType: '11v11',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      { x: 46, y: 50 }, // RT
      { x: 48, y: 50 }, // RG
      { x: 50, y: 50 }, // C
      { x: 52, y: 50 }, // LG
      { x: 54, y: 50 }, // LT

      { x: 30, y: 52 }, // Y - right slot
      { x: 12, y: 50 }, // Z - right outsidee
      { x: 88, y: 50 }, // X - left outside

      { x: 50, y: 59 }, // Q - QB
      { x: 70, y: 52 }, // H - left slot
      { x: 47, y: 61 }, // F - RB sidecar right
    ],
    // 5-2: ['E','T','E','S','M','W','J','C','C','SS','FS']
    defense: [
      { x: 46, y: 40 }, // E (left end 4-tech)
      { x: 50, y: 40 }, // T (nose)
      { x: 54, y: 40 }, // E (right end 4-tech)

      { x: 43, y: 40 }, // S (Sam, left edge)
      { x: 48, y: 49 }, // M (Mike over guard)
      { x: 52, y: 49 }, // W (Will over guard)
      { x: 57, y: 40 }, // J (Jack, right edge)

      // CBs outside X and Z
      { x: 12, y: 53 }, // C (left CB outside X)
      { x: 88, y: 53 }, // C (right CB outside Z)

      // Safeties anchored to hashes
      { x: 31, y: 57 }, // SS (strong hash)
      { x: 69, y: 57 }, // FS (weak hash)
    ],
  },
  {
    id: '7v7',
    label: 'Air Raid',
    gameType: '7v7',
    formationFamily: 'air_raid',
    formationFamilyLabel: 'Air Raid',
    position_labels: {
      offense: ['X', 'C', 'Z', 'WR', 'QB', 'RB', 'TE'],
      defense: ['CB', 'CB', 'W', 'M', 'S', 'FS', 'SS'],
    },
    offense: [
      { x: 10, y: 42 },
      { x: 30, y: 42 },
      { x: 70, y: 42 },
      { x: 90, y: 42 },
      { x: 50, y: 50 },
      { x: 42, y: 56 },
      { x: 58, y: 56 },
    ],
    defense: [
      { x: 10, y: 60 },
      { x: 90, y: 60 },
      { x: 35, y: 62 },
      { x: 50, y: 64 },
      { x: 65, y: 62 },
      { x: 38, y: 76 },
      { x: 62, y: 76 },
    ],
  },
  {
    id: '4v4',
    label: 'Spread',
    gameType: '4v4_flag',
    formationFamily: 'spread',
    formationFamilyLabel: 'Spread',
    position_labels: {
      offense: ['WR', 'WR', 'QB', 'RB'],
      defense: ['CB', 'CB', 'S', 'S'],
    },
    offense: [
      { x: 20, y: 42 },
      { x: 80, y: 42 },
      { x: 50, y: 52 },
      { x: 50, y: 58 },
    ],
    defense: [
      { x: 20, y: 62 },
      { x: 80, y: 62 },
      { x: 40, y: 74 },
      { x: 60, y: 74 },
    ],
  },
]

export const PLAY_TEMPLATES = PLAY_TEMPLATE_DEFINITIONS.reduce((gameTypes, template) => {
  const { gameType, formationFamily } = template
  gameTypes[gameType] ??= {}
  gameTypes[gameType][formationFamily] ??= []
  gameTypes[gameType][formationFamily].push(template)
  return gameTypes
}, {})

export const ALL_PLAY_TEMPLATES = Object.values(PLAY_TEMPLATES).flatMap((families) =>
  Object.values(families).flat(),
)
export const DEFAULT_GAME_TYPE = '11v11'
export const DEFAULT_PLAY_TEMPLATE = PLAY_TEMPLATES[DEFAULT_GAME_TYPE].pro_set[0]

export function getTemplatesForGameType(gameType) {
  return Object.values(PLAY_TEMPLATES[gameType] || {}).flat()
}

export function findPlayTemplate(id) {
  return ALL_PLAY_TEMPLATES.find((template) => template.id === id || template.legacyIds?.includes(id))
}

export function buildMarkersFromTemplate(template) {
  const markers = []
  const labels = template.position_labels
  template.offense.forEach((pos, index) => {
    const label = labels.offense[index] || 'O'
    markers.push({
      id: `offense-${index}`,
      label,
      x: pos.x,
      y: 85 - pos.y,
      team: 'offense',
      ...(label === 'C' ? { shape: 'rectangle' } : {}),
    })
  })
  template.defense.forEach((pos, index) => {
    markers.push({
      id: `defense-${index}`,
      label: labels.defense[index] || 'D',
      x: pos.x,
      y: pos.y,
      team: 'defense',
    })
  })
  return markers
}
