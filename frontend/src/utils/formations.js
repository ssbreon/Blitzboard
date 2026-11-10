/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
// Field coordinates are percentages: x = 0 (left) to 100 (right), y = 0 (top) to 100 (bottom).
const PLAY_TEMPLATE_DEFINITIONS = [
  // 1) Pro Set vs 4-3 Over
  {
    id: '11v11-pro-set-vs-4-3-over',
    legacyIds: ['11v11'],
    label: 'Pro Set vs 4-3 Over',
    gameType: '11v11',
    formationCategory: '21_personnel',
    defenseFront: '4-3-over',
    defenseFrontLabel: '4-3 Over',
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
    formationCategory: '21_personnel',
    defenseFront: '4-3-under',
    defenseFrontLabel: '4-3 Under',
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
    formationCategory: '21_personnel',
    defenseFront: '4-2-nickel',
    defenseFrontLabel: '4-2 Nickel',
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
    formationCategory: '21_personnel',
    defenseFront: '3-4-base',
    defenseFrontLabel: '3-4 Base',
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
    formationCategory: '21_personnel',
    defenseFront: '3-4-tite',
    defenseFrontLabel: '3-4 Tite',
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
    formationCategory: '21_personnel',
    defenseFront: '3-3-stack',
    defenseFrontLabel: '3-3 Stack',
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
      { x: 45.5, y: 40 }, // DE (left)
      { x: 50, y: 40 },   // NT
      { x: 54, y: 40 },   // DE (right)

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
    formationCategory: '21_personnel',
    defenseFront: 'bear',
    defenseFrontLabel: 'Bear',
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
    formationCategory: '21_personnel',
    defenseFront: '5-2',
    defenseFrontLabel: '5-2',
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
    formationCategory: '21_personnel',
    defenseFront: '4-3-over',
    defenseFrontLabel: '4-3 Over',
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
    formationCategory: '21_personnel',
    defenseFront: '4-3-under',
    defenseFrontLabel: '4-3 Under',
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
    formationCategory: '21_personnel',
    defenseFront: '4-2-nickel',
    defenseFrontLabel: '4-2 Nickel',
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
    formationCategory: '21_personnel',
    defenseFront: '3-4-base',
    defenseFrontLabel: '3-4 Base',
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
    formationCategory: '21_personnel',
    defenseFront: '3-4-tite',
    defenseFrontLabel: '3-4 Tite',
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
    formationCategory: '21_personnel',
    defenseFront: '3-3-stack',
    defenseFrontLabel: '3-3 Stack',
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
      { x: 45.5, y: 40 }, // DE (left)
      { x: 50, y: 40 },   // NT
      { x: 54, y: 40 },   // DE (right)

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
    formationCategory: '21_personnel',
    defenseFront: 'bear',
    defenseFrontLabel: 'Bear',
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
    formationCategory: '21_personnel',
    defenseFront: '5-2',
    defenseFrontLabel: '5-2',
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
  // 1) Ace vs 4-3 Over
  {
    id: '11v11-ace-vs-4-3-over',
    legacyIds: [],
    label: 'Ace vs 4-3 Over',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '4-3-over',
    defenseFrontLabel: '4-3 Over',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
    ],
    defense: [
      // Down linemen
      { x: 44, y: 40 },     // DE over LT
      { x: 47.5, y: 40 },   // T (3-tech)
      { x: 50.5, y: 40 },   // T (1-tech)
      { x: 54.5, y: 40 },   // DE over RT

      // Linebackers
      { x: 45.5, y: 49 }, // SLB
      { x: 51, y: 50 },   // MLB
      { x: 57, y: 49 }, // WLB

      // Cornerbacks
      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      // Safeties
      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 2) Ace vs 4-3 Under
  {
    id: '11v11-ace-vs-4-3-under',
    legacyIds: [],
    label: 'Ace vs 4-3 Under',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '4-3-under',
    defenseFrontLabel: '4-3 Under',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
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
  // 3) Ace vs 4-2 Nickel
  {
    id: '11v11-ace-vs-4-2-nickel',
    legacyIds: [],
    label: 'Ace vs 4-2 Nickel',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '4-2-nickel',
    defenseFrontLabel: '4-2 Nickel',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'E', 'N', 'M', 'W', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
    ],
    defense: [
      { x: 44.5, y: 40 },   // DE (weak)
      { x: 47.5, y: 40 }, // T (3-tech)
      { x: 50.5, y: 40 }, // T (1-tech)
      { x: 54.5, y: 40 }, // DE (strong)

      { x: 43, y: 49 }, // Nickel
      { x: 50, y: 49 }, // MLB
      { x: 57, y: 49 }, // WLB

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 4) Ace vs 3-4 Base
  {
    id: '11v11-ace-vs-3-4-base',
    legacyIds: [],
    label: 'Ace vs 3-4 Base',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '3-4-base',
    defenseFrontLabel: '3-4 Base',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
    ],
    defense: [
      { x: 45.5, y: 40 }, // DE (weak)
      { x: 50, y: 40 }, // NT
      { x: 54.5, y: 40 }, // DE (strong)

      { x: 43, y: 41 }, // SLB
      { x: 48, y: 49 }, // MLB
      { x: 52, y: 49 }, // WLB
      { x: 59, y: 43 }, // Jack

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 5) Ace vs 3-4 Tite
  {
    id: '11v11-ace-vs-tite',
    legacyIds: [],
    label: 'Ace vs 3-4 Tite',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '3-4-tite',
    defenseFrontLabel: '3-4 Tite',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
    ],
    defense: [
      { x: 46.5, y: 40 }, // DE (4i weak)
      { x: 50, y: 40 }, // NT (0-tech)
      { x: 53.5, y: 40 }, // DE (4i strong)

      { x: 43, y: 41 }, // SLB
      { x: 47, y: 49 }, // MLB
      { x: 53, y: 49 }, // WLB
      { x: 59, y: 43 }, // Jack

      { x: 16, y: 50 }, // CB (left)
      { x: 84, y: 50 }, // CB (right)

      { x: 35, y: 66 }, // SS (strong safety)
      { x: 65, y: 66 }, // FS (free safety)
    ],
  },
  // 6) Ace vs 3-3 Stack
  {
    id: '11v11-ace-vs-3-3-stack',
    legacyIds: [],
    label: 'Ace vs 3-3 Stack',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '3-3-stack',
    defenseFrontLabel: '3-3 Stack',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'SS', 'S', 'M', 'W', 'WS', 'C', 'FS', 'C'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
    ],
    defense: [
      { x: 45.5, y: 40 }, // DE (left)
      { x: 50, y: 40 },   // NT
      { x: 54, y: 40 },   // DE (right)

      { x: 42, y: 44 }, // SS (strong safety)
      { x: 46, y: 49 }, // SLB
      { x: 50, y: 50 }, // MLB
      { x: 54, y: 49 }, // WLB
      { x: 68, y: 49 }, // WS (weak safety)

      { x: 18, y: 54 }, // CB (left)
      { x: 50, y: 67 }, // FS (free safety)
      { x: 82, y: 54 }, // CB (right)
    ],
  },
  // 7) Ace vs Bear
  {
    id: '11v11-ace-vs-bear',
    legacyIds: [],
    label: 'Ace vs Bear',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: 'bear',
    defenseFrontLabel: 'Bear',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'T', 'T', 'E', 'S', 'M', 'W', 'C', 'FS', 'C'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
    ],
    defense: [
      { x: 42, y: 40 }, // DE (weak)
      { x: 47.5, y: 40 }, // T (weak 3-tech)
      { x: 50, y: 40 }, // NT
      { x: 52.5, y: 40 }, // T (strong 3-tech)
      { x: 55, y: 40 }, // DE (strong)

      { x: 44.5, y: 40 }, // SLB
      { x: 50, y: 49 }, // MLB
      { x: 68, y: 49 }, // WLB

      { x: 18, y: 54 }, // CB (left)
      { x: 50, y: 67 }, // FS (free safety)
      { x: 82, y: 54 }, // CB (right)
    ],
  },
  // 8) Ace vs 5-2
  {
    id: '11v11-ace-vs-5-2',
    legacyIds: [],
    label: 'Ace vs 5-2',
    gameType: '11v11',
    formationCategory: '11_personnel',
    defenseFront: '5-2',
    defenseFrontLabel: '5-2',
    formationFamily: 'ace',
    formationFamilyLabel: 'Ace',
    position_labels: {
      offense: ['RT', 'RG', 'C', 'LG', 'LT', 'Y', 'Z', 'X', 'Q', 'H', 'F'],
      defense: ['E', 'T', 'E', 'S', 'M', 'W', 'J', 'C', 'C', 'SS', 'FS'],
    },
    offense: [
      // Offensive line
      { x: 46, y: 50 },  //RT
      { x: 48, y: 50 },  //RG
      { x: 50, y: 50 },  //C
      { x: 52, y: 50 },  //LG
      { x: 54, y: 50 },  //LT

      // Tight end (strong side)
      { x: 44, y: 50 },  //TE

      // Wide receivers
      { x: 17, y: 50 },  //Z
      { x: 83, y: 50 },  //X

      // Quarterback
      { x: 50, y: 59 },  //Quarterback

      // H-back / slot
      { x: 69, y: 52 },  //H

      // Tailback
      { x: 47, y: 61 },  //F
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
    formationCategory: '10_personnel',
    defenseFront: '4-3-over',
    defenseFrontLabel: '4-3 Over',
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
    formationCategory: '10_personnel',
    defenseFront: '4-3-under',
    defenseFrontLabel: '4-3 Under',
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
    formationCategory: '10_personnel',
    defenseFront: '4-2-nickel',
    defenseFrontLabel: '4-2 Nickel',
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
    formationCategory: '10_personnel',
    defenseFront: '3-4-base',
    defenseFrontLabel: '3-4 Base',
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
    formationCategory: '10_personnel',
    defenseFront: '3-4-tite',
    defenseFrontLabel: '3-4 Tite',
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
    formationCategory: '10_personnel',
    defenseFront: '3-3-stack',
    defenseFrontLabel: '3-3 Stack',
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
    formationCategory: '10_personnel',
    defenseFront: 'bear',
    defenseFrontLabel: 'Bear',
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
    formationCategory: '10_personnel',
    defenseFront: '5-2',
    defenseFrontLabel: '5-2',
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
    formationCategory: '11_personnel',
    defenseFront: null,
    defenseFrontLabel: null,
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
    formationCategory: '10_personnel',
    defenseFront: null,
    defenseFrontLabel: null,
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

function positionsFromRows(rows) {
  return rows.flatMap(({ y, xPositions }) => xPositions.map((xPosition) => ({ x: xPosition, y })))
}

// Converts yards from the line of scrimmage (positive = kicking side) into template y values, which
// use a 40-yard layout window (LOS at 37.5%, 2.5% per yard); fitMarkersToWindow maps them to the play's window.
function kickingRowY(yardsFromLos, team) {
  const percent = 37.5 - 2.5 * yardsFromLos
  return team === 'offense' ? 85 - percent : percent
}

const SPECIAL_TEAMS_OFFENSE_FORMATIONS = {
  balancedKickoff: {
    positionLabels: ['L1', 'L2', 'L3', 'L4', 'L5', 'R5', 'R4', 'R3', 'R2', 'R1', 'K'],
    positions: positionsFromRows([
      { y: kickingRowY(1, 'offense'), xPositions: [5, 15, 24, 33, 42, 58, 67, 76, 85, 95] },
      { y: kickingRowY(5, 'offense'), xPositions: [50] },
    ]),
  },
  shieldPunt: {
    positionLabels: ['LE', 'LT', 'LG', 'LS', 'RG', 'RT', 'RE', 'W', 'W', 'PP', 'P'],
    positions: positionsFromRows([
      { y: 48, xPositions: [20, 30, 40, 50, 60, 70, 80] },
      { y: 55, xPositions: [8, 92] },
      { y: 62, xPositions: [50] },
      { y: 76, xPositions: [50] },
    ]),
  },
  spreadPunt: {
    positionLabels: ['LT', 'LG', 'LS', 'RG', 'RT', 'G', 'G', 'W', 'W', 'PP', 'P'],
    positions: positionsFromRows([
      { y: 48, xPositions: [30, 40, 50, 60, 70] },
      { y: 43, xPositions: [8, 92] },
      { y: 56, xPositions: [20, 80] },
      { y: 64, xPositions: [50] },
      { y: 77, xPositions: [50] },
    ]),
  },
  patProtection: {
    positionLabels: ['TE', 'LT', 'LG', 'C', 'RG', 'RT', 'TE', 'W', 'W', 'H', 'K'],
    positions: positionsFromRows([
      { y: 50, xPositions: [20, 30, 40, 50, 60, 70, 80] },
      { y: 49, xPositions: [8, 92] },
      { y: 63, xPositions: [50] },
      { y: 74, xPositions: [52] },
    ]),
  },
  onsideKick: {
    positionLabels: ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'K'],
    positions: positionsFromRows([
      { y: 46, xPositions: [5, 15, 24, 33, 42, 58, 67, 76, 85, 95] },
      { y: 70, xPositions: [50] },
    ]),
  },
}

const SPECIAL_TEAMS_DEFENSE_FORMATIONS = {
  return5222: {
    positionLabels: ['T', 'G', 'C', 'G', 'T', 'E', 'E', 'FB', 'FB', 'R1', 'R2'],
    positions: positionsFromRows([
      { y: kickingRowY(-12, 'defense'), xPositions: [18, 34, 50, 66, 82] },
      { y: kickingRowY(-22, 'defense'), xPositions: [35, 65] },
      { y: kickingRowY(-34, 'defense'), xPositions: [40, 60] },
      { y: kickingRowY(-48, 'defense'), xPositions: [35, 65] },
    ]),
  },
  return5321: {
    positionLabels: ['T', 'G', 'C', 'G', 'T', 'E', 'M', 'E', 'FB', 'FB', 'RB'],
    positions: positionsFromRows([
      { y: kickingRowY(-12, 'defense'), xPositions: [18, 34, 50, 66, 82] },
      { y: kickingRowY(-22, 'defense'), xPositions: [30, 50, 70] },
      { y: kickingRowY(-34, 'defense'), xPositions: [40, 60] },
      { y: kickingRowY(-48, 'defense'), xPositions: [50] },
    ]),
  },
  puntReturn: {
    positionLabels: ['G', 'G', 'B', 'B', 'B', 'B', 'B', 'B', 'B', 'R', 'R'],
    positions: positionsFromRows([
      { y: 38, xPositions: [24, 40, 60, 76] },
      { y: 50, xPositions: [18, 40, 60, 82] },
      { y: 62, xPositions: [35] },
      { y: 74, xPositions: [42, 58] },
    ]),
  },
  puntBlock: {
    positionLabels: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'B', 'B', 'B', 'B'],
    positions: positionsFromRows([
      { y: 35, xPositions: [10, 23, 36, 50, 64, 77, 90] },
      { y: 48, xPositions: [35, 65] },
      { y: 62, xPositions: [35, 65] },
    ]),
  },
  baseBlock: {
    positionLabels: ['E', 'T', 'T', 'E', 'E', 'S', 'M', 'W', 'C', 'FS', 'C'],
    positions: positionsFromRows([
      { y: 36, xPositions: [20, 35, 50, 65, 80] },
      { y: 49, xPositions: [30, 50, 70] },
      { y: 65, xPositions: [25, 50, 75] },
    ]),
  },
  heavyBlock: {
    positionLabels: ['R', 'R', 'R', 'R', 'R', 'R', 'R', 'B', 'B', 'B', 'B'],
    positions: positionsFromRows([
      { y: 35, xPositions: [12, 25, 37, 50, 63, 75, 88] },
      { y: 50, xPositions: [32, 44, 56, 68] },
    ]),
  },
  handsTeam: {
    positionLabels: ['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
    positions: positionsFromRows([
      { y: 40, xPositions: [25, 40, 60, 75] },
      { y: 53, xPositions: [20, 40, 60, 80] },
      { y: 68, xPositions: [35, 50, 65] },
    ]),
  },
}

const SPECIAL_TEAMS_TEMPLATE_CONFIGS = [
  ['11v11-balanced-kickoff-vs-5-2-2-2-return', 'Balanced Kickoff vs 5-2-2-2 Return', ['Kickoff', 'Kickoff Return'], 'balancedKickoff', 'return5222'],
  ['11v11-balanced-kickoff-vs-5-3-2-1-return', 'Balanced Kickoff vs 5-3-2-1 Return', ['Kickoff', 'Kickoff Return'], 'balancedKickoff', 'return5321'],
  ['11v11-shield-punt-vs-base-return', 'Shield Punt vs Base Return', ['Punt', 'Punt Return'], 'shieldPunt', 'puntReturn'],
  ['11v11-shield-punt-vs-punt-block', 'Shield Punt vs Punt Block', ['Punt', 'Punt Return'], 'shieldPunt', 'puntBlock'],
  ['11v11-spread-punt-vs-base-return', 'Spread Punt vs Base Return', ['Punt', 'Punt Return'], 'spreadPunt', 'puntReturn'],
  ['11v11-spread-punt-vs-punt-block', 'Spread Punt vs Punt Block', ['Punt', 'Punt Return'], 'spreadPunt', 'puntBlock'],
  ['11v11-pat-fg-protection-vs-base-block', 'PAT-FG Protection vs Base Block', ['PAT/FG', 'PAT/FG Block'], 'patProtection', 'baseBlock'],
  ['11v11-pat-fg-protection-vs-heavy-block', 'PAT-FG Protection vs Heavy Block', ['PAT/FG', 'PAT/FG Block'], 'patProtection', 'heavyBlock'],
  ['11v11-onside-kick-vs-hands-team', 'Onside Kick vs Hands Team', ['Onside Kick', 'Hands Team'], 'onsideKick', 'handsTeam'],
]

const SPECIAL_TEAMS_TEMPLATE_DEFINITIONS = SPECIAL_TEAMS_TEMPLATE_CONFIGS.map(([id, label, categories, offenseKey, defenseKey]) => {
  const offenseFormation = SPECIAL_TEAMS_OFFENSE_FORMATIONS[offenseKey]
  const defenseFormation = SPECIAL_TEAMS_DEFENSE_FORMATIONS[defenseKey]
  return {
    id,
    legacyIds: [],
    label,
    gameType: '11v11',
    formationCategory: 'special_teams',
    defenseFront: null,
    defenseFrontLabel: null,
    formationFamily: 'special_teams',
    formationFamilyLabel: 'Special Teams',
    categories,
    position_labels: {
      offense: offenseFormation.positionLabels,
      defense: defenseFormation.positionLabels,
    },
    offense: offenseFormation.positions,
    defense: defenseFormation.positions,
  }
})

const ALL_PLAY_TEMPLATE_DEFINITIONS = [...PLAY_TEMPLATE_DEFINITIONS, ...SPECIAL_TEAMS_TEMPLATE_DEFINITIONS]

export const PLAY_TEMPLATES = ALL_PLAY_TEMPLATE_DEFINITIONS.reduce((gameTypes, template) => {
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

const SPECIAL_TEAMS_TEMPLATE_CATEGORIES = new Set([
  'Kickoff',
  'Kickoff Return',
  'Punt',
  'Punt Return',
  'PAT/FG',
  'PAT/FG Block',
  'Onside Kick',
  'Hands Team',
])

export function getTemplatesForGameType(gameType, category) {
  const templates = Object.values(PLAY_TEMPLATES[gameType] || {}).flat()
  if (category === undefined) return templates
  if (!gameType || !category) return []
  if (gameType === '11v11' && SPECIAL_TEAMS_TEMPLATE_CATEGORIES.has(category)) {
    return templates.filter((template) => template.categories?.includes(category))
  }
  return templates.filter((template) => !template.categories)
}

export function findPlayTemplate(id) {
  return ALL_PLAY_TEMPLATES.find((template) => template.id === id || template.legacyIds?.includes(id))
}

// Scrimmage templates were laid out with ~3 ft line splits; widen the box so larger player symbols
// don't overlap on a true-proportion field while keeping wide players inside the sidelines.
const BOX_HALF_WIDTH = 10
const BOX_SPREAD = 1.9

function spreadTemplateX(x) {
  const offset = x - 50
  const distance = Math.abs(offset)
  const spread = distance <= BOX_HALF_WIDTH
    ? distance * BOX_SPREAD
    : BOX_HALF_WIDTH * BOX_SPREAD + (distance - BOX_HALF_WIDTH) * ((50 - BOX_HALF_WIDTH * BOX_SPREAD) / (50 - BOX_HALF_WIDTH))
  return Math.round((50 + Math.sign(offset) * spread) * 100) / 100
}

export function buildMarkersFromTemplate(template) {
  const markers = []
  const labels = template.position_labels
  const templateX = template.formationFamily === 'special_teams' ? (x) => x : spreadTemplateX
  template.offense.forEach((pos, index) => {
    const label = labels.offense[index] || 'O'
    markers.push({
      id: `offense-${index}`,
      label,
      x: templateX(pos.x),
      y: 85 - pos.y,
      team: 'offense',
      ...(label === 'C' ? { shape: 'rectangle' } : {}),
    })
  })
  template.defense.forEach((pos, index) => {
    markers.push({
      id: `defense-${index}`,
      label: labels.defense[index] || 'D',
      x: templateX(pos.x),
      y: pos.y,
      team: 'defense',
    })
  })
  return markers
}

export function applyPlayerLabelOption(markers, option) {
  if (option === 'No labels') return markers.map((marker) => ({ ...marker, label: '' }))
  if (option === 'No offensive line Labels') {
    const offensiveLineLabels = new Set(['LT', 'LG', 'C', 'RG', 'RT'])
    return markers.map((marker) =>
      marker.team === 'offense' && offensiveLineLabels.has(marker.label) ? { ...marker, label: '' } : marker,
    )
  }
  return markers
}
