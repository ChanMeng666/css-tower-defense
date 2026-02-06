/**
 * Te Pā Tiaki - Daily Challenge System
 * Short-session challenges with custom waves, categories, and special modifiers
 */

var Challenge = (function() {
    'use strict';

    // =========================================
    // Challenge Templates (~20 templates, 6 categories)
    // =========================================
    var TEMPLATES = {
        // === CONSTRAINT (5 templates, 3-4 waves) ===
        taiaha_only: {
            name: 'Ara Taiaha',
            description: 'Taiaha towers only',
            category: 'constraint',
            allowedTowers: ['taiaha'],
            scoreBonus: 1.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Kehua approach...' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 8, interval: 1200 }] }
                    ],
                    reward: 30
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'More spirits!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 6, interval: 1000 },
                            { type: 'patupaiarehe', count: 4, interval: 1500 }
                        ] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'The swarm grows!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 10, interval: 800 },
                            { type: 'patupaiarehe', count: 6, interval: 1200 }
                        ] }
                    ],
                    reward: 50
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Toa warriors appear!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 8, interval: 1000 },
                            { type: 'toa', count: 2, interval: 3000 }
                        ] }
                    ],
                    reward: 75
                }
            ]
        },
        no_sell: {
            name: 'Kore Hoko',
            description: 'Cannot sell towers',
            category: 'constraint',
            noSell: true,
            scoreBonus: 1.25,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Choose wisely...' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 6, interval: 1500 }] }
                    ],
                    reward: 30
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'No refunds!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 5, interval: 1200 },
                            { type: 'patupaiarehe', count: 4, interval: 1500 }
                        ] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'Hold the line!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000 },
                            { type: 'toa', count: 3, interval: 2500 }
                        ] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The final test!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 10, interval: 800 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 80
                }
            ]
        },
        budget: {
            name: 'Pēneti Iti',
            description: 'Start with only 50 gold',
            category: 'constraint',
            startGold: 50,
            scoreBonus: 2.0,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Every coin counts...' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 5, interval: 1800 }] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Spend wisely!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 6, interval: 1500 },
                            { type: 'patupaiarehe', count: 3, interval: 2000 }
                        ] }
                    ],
                    reward: 50
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Make it count!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1200 },
                            { type: 'toa', count: 2, interval: 3000 }
                        ] }
                    ],
                    reward: 75
                }
            ]
        },
        tower_limit: {
            name: 'Ngāwari',
            description: 'Maximum 6 towers',
            category: 'constraint',
            maxTowers: 6,
            scoreBonus: 2.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Six towers only!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 1200 },
                            { type: 'patupaiarehe', count: 3, interval: 1800 }
                        ] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Position matters!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000 },
                            { type: 'toa', count: 3, interval: 2500 }
                        ] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'The horde approaches!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 12, interval: 800 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 80
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Prove your skill!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 8, interval: 1000, variant: 'rangatira' },
                            { type: 'toa', count: 5, interval: 1800 }
                        ] }
                    ],
                    reward: 100
                }
            ]
        },
        moana: {
            name: 'Te Moana',
            description: 'Taiaha and Tangaroa towers only',
            category: 'constraint',
            allowedTowers: ['taiaha', 'tangaroa'],
            scoreBonus: 1.75,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Ocean warriors rise!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 8, interval: 1200 }] }
                    ],
                    reward: 30
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'The tide swells!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 6, interval: 1000 },
                            { type: 'patupaiarehe', count: 5, interval: 1500 }
                        ] }
                    ],
                    reward: 45
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'Warriors charge!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1200 },
                            { type: 'toa', count: 3, interval: 2500 }
                        ] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Hold the shore!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 10, interval: 800 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 80
                }
            ]
        },

        // === SPEED (3 templates, 3 waves, with time limit) ===
        te_oma_tere: {
            name: 'Te Oma Tere',
            description: 'Complete 3 waves before time runs out!',
            category: 'speed',
            timeLimit: 300,
            scoreBonus: 1.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'The clock is ticking!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 1000 },
                            { type: 'patupaiarehe', count: 4, interval: 1200 }
                        ] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Faster!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 8, interval: 800 },
                            { type: 'toa', count: 3, interval: 2000 }
                        ] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Beat the clock!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 12, interval: 600 },
                            { type: 'toa', count: 4, interval: 1800 }
                        ] }
                    ],
                    reward: 80
                }
            ]
        },
        te_hikoi: {
            name: 'Te Hīkoi',
            description: '3 dense waves, 4 minute time limit',
            category: 'speed',
            timeLimit: 240,
            scoreBonus: 1.75,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Kehua flood!' } },
                        { time: 1500, type: 'spawn', data: [{ type: 'kehua', count: 15, interval: 600 }] }
                    ],
                    reward: 35
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Overwhelming numbers!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 12, interval: 500 },
                            { type: 'patupaiarehe', count: 6, interval: 800 }
                        ] }
                    ],
                    reward: 50
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The final rush!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 15, interval: 400 },
                            { type: 'patupaiarehe', count: 8, interval: 700 }
                        ] }
                    ],
                    reward: 70
                }
            ]
        },
        te_whakataetae: {
            name: 'Te Whakataetae',
            description: '3 waves with toa, 6 minute limit',
            category: 'speed',
            timeLimit: 360,
            scoreBonus: 2.0,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Toa advance!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'toa', count: 4, interval: 2000 },
                            { type: 'kehua', count: 6, interval: 1200 }
                        ] }
                    ],
                    reward: 50
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Warriors march!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'toa', count: 6, interval: 1800 },
                            { type: 'patupaiarehe', count: 5, interval: 1200 }
                        ] }
                    ],
                    reward: 70
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The war party!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'toa', count: 8, interval: 1500 },
                            { type: 'patupaiarehe', count: 6, interval: 1000, variant: 'rangatira' }
                        ] }
                    ],
                    reward: 100
                }
            ]
        },

        // === BOSS (3 templates, 1-2 waves) ===
        taniwha_duel: {
            name: 'Taniwha Duel',
            description: '1 warmup wave + boss fight',
            category: 'boss',
            startGold: 400,
            scoreBonus: 2.0,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Prepare for the Taniwha!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'toa', count: 4, interval: 2000 },
                            { type: 'kehua', count: 8, interval: 1000 }
                        ] }
                    ],
                    reward: 100
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'TANIWHA!', subtitle: 'The water guardian emerges!' } },
                        { time: 2500, type: 'warning', data: { message: 'TANIWHA INCOMING!' } },
                        { time: 4000, type: 'spawn', data: [
                            { type: 'toa', count: 3, interval: 2500 }
                        ] },
                        { time: 8000, type: 'bossSpawn', data: { type: 'taniwha' } }
                    ],
                    reward: 200
                }
            ]
        },
        taniwha_tohu: {
            name: 'Taniwha Tohu',
            description: 'Boss only - no warmup!',
            category: 'boss',
            startGold: 600,
            startLives: 10,
            scoreBonus: 2.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'TANIWHA!', subtitle: 'Face the guardian!' } },
                        { time: 3000, type: 'bossSpawn', data: { type: 'taniwha' } }
                    ],
                    reward: 300
                }
            ]
        },
        nga_taniwha: {
            name: 'Ngā Taniwha',
            description: 'Two taniwha battles!',
            category: 'boss',
            startGold: 800,
            scoreBonus: 3.0,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'TANIWHA I', subtitle: 'The first guardian!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'toa', count: 3, interval: 2000 }] },
                        { time: 6000, type: 'bossSpawn', data: { type: 'taniwha' } }
                    ],
                    reward: 200
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'TANIWHA II', subtitle: 'Another rises!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'toa', count: 5, interval: 1800 },
                            { type: 'kehua', count: 8, interval: 800 }
                        ] },
                        { time: 8000, type: 'bossSpawn', data: { type: 'taniwha' } }
                    ],
                    reward: 300
                }
            ]
        },

        // === SURVIVAL (2 templates, 8 waves with auto-start) ===
        te_whawhai: {
            name: 'Te Whawhai',
            description: 'Survive as long as you can! Waves auto-start.',
            category: 'survival',
            startGold: 150,
            survivalMode: true,
            scoreBonus: 1.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 1', subtitle: 'It begins...' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 6, interval: 1200 }] }
                    ],
                    reward: 25
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 2', subtitle: 'They keep coming!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 1000 },
                            { type: 'patupaiarehe', count: 3, interval: 1500 }
                        ] }
                    ],
                    reward: 30
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 3', subtitle: 'Stronger now!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000 },
                            { type: 'kehua', count: 8, interval: 800 }
                        ] }
                    ],
                    reward: 35
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 4', subtitle: 'Toa appear!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'toa', count: 3, interval: 2500 },
                            { type: 'patupaiarehe', count: 6, interval: 1000 }
                        ] }
                    ],
                    reward: 45
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 5', subtitle: 'The horde!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 12, interval: 600 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 50
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 6', subtitle: 'Rangatira forces!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 8, interval: 800, variant: 'rangatira' },
                            { type: 'toa', count: 5, interval: 1800 }
                        ] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 7', subtitle: 'Unstoppable!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 15, interval: 500 },
                            { type: 'toa', count: 6, interval: 1500, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 75
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL SURVIVAL', subtitle: 'Everything at once!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 15, interval: 400 },
                            { type: 'patupaiarehe', count: 10, interval: 700, variant: 'rangatira' },
                            { type: 'toa', count: 8, interval: 1200 }
                        ] }
                    ],
                    reward: 100
                }
            ]
        },
        te_pakanga_mutunga: {
            name: 'Te Pakanga Mutunga',
            description: 'Survival with armored enemies!',
            category: 'survival',
            startGold: 200,
            survivalMode: true,
            scoreBonus: 2.0,
            enemyMods: { armorBonus: 5 },
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 1', subtitle: 'Armored spirits...' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 6, interval: 1200, variant: 'pakanga' }] }
                    ],
                    reward: 30
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 2', subtitle: 'Heavy armor!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 1000, variant: 'pakanga' },
                            { type: 'patupaiarehe', count: 4, interval: 1500, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 3', subtitle: 'Iron wall!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'toa', count: 5, interval: 2000, variant: 'pakanga' },
                            { type: 'patupaiarehe', count: 6, interval: 1200, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 55
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 4', subtitle: 'Unbreakable!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'toa', count: 6, interval: 1800, variant: 'pakanga' },
                            { type: 'kehua', count: 10, interval: 700, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 70
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 5', subtitle: 'The armored horde!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 12, interval: 600, variant: 'pakanga' },
                            { type: 'toa', count: 8, interval: 1500, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 90
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 6', subtitle: 'Fortress of steel!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 10, interval: 800, variant: 'pakanga' },
                            { type: 'toa', count: 8, interval: 1200, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 100
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Survival 7', subtitle: 'No end in sight!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 15, interval: 500, variant: 'pakanga' },
                            { type: 'toa', count: 10, interval: 1000, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 120
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL SURVIVAL', subtitle: 'The ultimate test!' } },
                        { time: 1500, type: 'spawn', data: [
                            { type: 'kehua', count: 20, interval: 400, variant: 'pakanga' },
                            { type: 'patupaiarehe', count: 12, interval: 600, variant: 'pakanga' },
                            { type: 'toa', count: 10, interval: 1000, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 150
                }
            ]
        },

        // === THEMED (4 templates, 3 waves) ===
        tere_swarm: {
            name: 'Te Tere Swarm',
            description: 'All swift enemies, wind weather!',
            category: 'themed',
            fixedWeather: 'wind',
            scoreBonus: 1.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Swift spirits!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 10, interval: 800, variant: 'tere' }] }
                    ],
                    reward: 35
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Swift fairies!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 700, variant: 'tere' },
                            { type: 'patupaiarehe', count: 6, interval: 900, variant: 'tere' }
                        ] }
                    ],
                    reward: 50
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The wind carries them!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 12, interval: 500, variant: 'tere' },
                            { type: 'patupaiarehe', count: 8, interval: 700, variant: 'tere' },
                            { type: 'toa', count: 3, interval: 2000, variant: 'tere' }
                        ] }
                    ],
                    reward: 75
                }
            ]
        },
        pakanga_siege: {
            name: 'Te Pakanga Siege',
            description: 'All armored, winter locked!',
            category: 'themed',
            fixedSeason: 'takurua',
            scoreBonus: 1.75,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Armored advance!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 6, interval: 1200, variant: 'pakanga' },
                            { type: 'patupaiarehe', count: 4, interval: 1500, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 45
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Iron wall!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'toa', count: 5, interval: 2000, variant: 'pakanga' },
                            { type: 'patupaiarehe', count: 6, interval: 1200, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 65
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The siege breaks!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'toa', count: 8, interval: 1500, variant: 'pakanga' },
                            { type: 'kehua', count: 10, interval: 800, variant: 'pakanga' }
                        ] }
                    ],
                    reward: 90
                }
            ]
        },
        mate_plague: {
            name: 'Te Mate Plague',
            description: 'All toxic enemies!',
            category: 'themed',
            scoreBonus: 1.75,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Toxic spirits!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 8, interval: 1000, variant: 'mate' }] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'The plague spreads!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 6, interval: 800, variant: 'mate' },
                            { type: 'patupaiarehe', count: 5, interval: 1200, variant: 'mate' }
                        ] }
                    ],
                    reward: 55
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Deadly convergence!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 10, interval: 700, variant: 'mate' },
                            { type: 'patupaiarehe', count: 8, interval: 900, variant: 'mate' },
                            { type: 'toa', count: 3, interval: 2500, variant: 'mate' }
                        ] }
                    ],
                    reward: 80
                }
            ]
        },
        rangatira_assault: {
            name: 'Rangatira Assault',
            description: 'All elite enemies!',
            category: 'themed',
            scoreBonus: 2.0,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Elite forces!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 6, interval: 1200, variant: 'rangatira' }] }
                    ],
                    reward: 45
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Rangatira march!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 5, interval: 1000, variant: 'rangatira' },
                            { type: 'patupaiarehe', count: 4, interval: 1500, variant: 'rangatira' }
                        ] }
                    ],
                    reward: 65
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'The chiefs unite!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000, variant: 'rangatira' },
                            { type: 'toa', count: 5, interval: 1800, variant: 'rangatira' }
                        ] }
                    ],
                    reward: 90
                }
            ]
        },

        // === ECONOMY (3 templates, 3-4 waves) ===
        kore_koura: {
            name: 'Kore Koura',
            description: 'No gold from kills! Only wave rewards.',
            category: 'economy',
            startGold: 200,
            noKillGold: true,
            scoreBonus: 2.0,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'No kill gold!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 6, interval: 1500 }] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Manage wisely!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 1200 },
                            { type: 'patupaiarehe', count: 4, interval: 1500 }
                        ] }
                    ],
                    reward: 80
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Final push!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 100
                }
            ]
        },
        koura_nui: {
            name: 'Koura Nui',
            description: '500 starting gold, but enemies have 2x HP!',
            category: 'economy',
            startGold: 500,
            scoreBonus: 1.75,
            enemyMods: { healthMult: 2.0 },
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Tough enemies!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 8, interval: 1200 },
                            { type: 'patupaiarehe', count: 4, interval: 1500 }
                        ] }
                    ],
                    reward: 40
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Even tougher!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 60
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 3', subtitle: 'The wall of flesh!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'toa', count: 6, interval: 1800 },
                            { type: 'kehua', count: 10, interval: 800 }
                        ] }
                    ],
                    reward: 80
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Spend it all!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'toa', count: 8, interval: 1500 },
                            { type: 'patupaiarehe', count: 8, interval: 1000, variant: 'rangatira' }
                        ] }
                    ],
                    reward: 100
                }
            ]
        },
        te_hokohoko: {
            name: 'Te Hokohoko',
            description: 'Start with 50 gold, big wave rewards!',
            category: 'economy',
            startGold: 50,
            scoreBonus: 1.5,
            waves: [
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 1', subtitle: 'Trade wisely!' } },
                        { time: 2000, type: 'spawn', data: [{ type: 'kehua', count: 5, interval: 1500 }] }
                    ],
                    reward: 80
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'Wave 2', subtitle: 'Invest and grow!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'kehua', count: 6, interval: 1200 },
                            { type: 'patupaiarehe', count: 4, interval: 1500 }
                        ] }
                    ],
                    reward: 100
                },
                {
                    events: [
                        { time: 0, type: 'announcement', data: { title: 'FINAL WAVE', subtitle: 'Reap the rewards!' } },
                        { time: 2000, type: 'spawn', data: [
                            { type: 'patupaiarehe', count: 6, interval: 1000 },
                            { type: 'toa', count: 4, interval: 2000 }
                        ] }
                    ],
                    reward: 120
                }
            ]
        }
    };

    // =========================================
    // Module State
    // =========================================
    var active = false;
    var currentTemplate = null;
    var currentTemplateId = null;
    var trackingData = {};
    var challengeStartTime = 0;
    var challengeElapsed = 0;

    // =========================================
    // Core Methods
    // =========================================

    function startChallenge(templateId) {
        var template = TEMPLATES[templateId];
        if (!template) return false;
        active = true;
        currentTemplateId = templateId;
        currentTemplate = template;
        trackingData = { comboSum: 0, materialsCollected: 0 };
        challengeStartTime = 0;
        challengeElapsed = 0;

        // Show challenge banner
        showBanner();
        return true;
    }

    function showBanner() {
        var existing = document.getElementById('challengeBanner');
        if (existing) existing.parentNode.removeChild(existing);

        if (!active || !currentTemplate) return;

        var banner = document.createElement('div');
        banner.className = 'challenge-banner';
        banner.id = 'challengeBanner';
        banner.textContent = 'Challenge: ' + currentTemplate.name;
        document.body.appendChild(banner);
    }

    function hideBanner() {
        var el = document.getElementById('challengeBanner');
        if (el) el.parentNode.removeChild(el);
    }

    function isActive() {
        return active;
    }

    function getTemplate() {
        return currentTemplate;
    }

    function getTemplateId() {
        return currentTemplateId;
    }

    function getTrackingData() {
        return trackingData;
    }

    function getCategory() {
        if (!active || !currentTemplate) return 'constraint';
        return currentTemplate.category || 'constraint';
    }

    // =========================================
    // Challenge Wave/Modifier Getters
    // =========================================

    function getChallengeWaves() {
        if (!active || !currentTemplate) return null;
        return currentTemplate.waves || null;
    }

    function getTimeLimit() {
        if (!active || !currentTemplate) return null;
        return currentTemplate.timeLimit || null;
    }

    function isSurvivalMode() {
        if (!active || !currentTemplate) return false;
        return currentTemplate.survivalMode || false;
    }

    function isNoKillGold() {
        if (!active || !currentTemplate) return false;
        return currentTemplate.noKillGold || false;
    }

    function getEnemyMods() {
        if (!active || !currentTemplate) return null;
        return currentTemplate.enemyMods || null;
    }

    function getFixedSeason() {
        if (!active || !currentTemplate) return null;
        return currentTemplate.fixedSeason || null;
    }

    function getFixedWeather() {
        if (!active || !currentTemplate) return null;
        return currentTemplate.fixedWeather || null;
    }

    // =========================================
    // Tower/Sell Constraints
    // =========================================

    function isTowerAllowed(type) {
        if (!active || !currentTemplate) return true;
        if (currentTemplate.allowedTowers) {
            return currentTemplate.allowedTowers.indexOf(type) !== -1;
        }
        return true;
    }

    function isSellAllowed() {
        if (!active || !currentTemplate) return true;
        return !currentTemplate.noSell;
    }

    function getMaxTowers() {
        if (!active || !currentTemplate) return Infinity;
        return currentTemplate.maxTowers || Infinity;
    }

    function getStartModifiers() {
        if (!active || !currentTemplate) return {};
        var mods = {};
        if (currentTemplate.startGold !== undefined) mods.gold = currentTemplate.startGold;
        if (currentTemplate.startLives !== undefined) mods.lives = currentTemplate.startLives;
        return mods;
    }

    function getScoreBonus() {
        if (!active || !currentTemplate) return 1.0;
        return currentTemplate.scoreBonus || 1.0;
    }

    // =========================================
    // Timer
    // =========================================

    function updateTimer(dt) {
        challengeElapsed += dt;
    }

    function getElapsedTime() {
        return challengeElapsed;
    }

    // =========================================
    // End Challenge
    // =========================================

    function end() {
        active = false;
        currentTemplate = null;
        currentTemplateId = null;
        trackingData = {};
        challengeElapsed = 0;
        hideBanner();

        // Remove challenge timer display
        var timer = document.getElementById('challengeTimer');
        if (timer && timer.parentNode) timer.parentNode.removeChild(timer);

        // Reset wave data back to default
        if (typeof Wave !== 'undefined' && Wave.resetWaveData) {
            Wave.resetWaveData();
        }
    }

    return {
        startChallenge: startChallenge,
        isActive: isActive,
        getTemplate: getTemplate,
        getTemplateId: getTemplateId,
        getTrackingData: getTrackingData,
        getCategory: getCategory,
        getChallengeWaves: getChallengeWaves,
        getTimeLimit: getTimeLimit,
        isSurvivalMode: isSurvivalMode,
        isNoKillGold: isNoKillGold,
        getEnemyMods: getEnemyMods,
        getFixedSeason: getFixedSeason,
        getFixedWeather: getFixedWeather,
        isTowerAllowed: isTowerAllowed,
        isSellAllowed: isSellAllowed,
        getMaxTowers: getMaxTowers,
        getStartModifiers: getStartModifiers,
        getScoreBonus: getScoreBonus,
        updateTimer: updateTimer,
        getElapsedTime: getElapsedTime,
        end: end,
        TEMPLATES: TEMPLATES
    };
})();
