"""Synthetic fixture data for the isolated landing-preview capture.

Nothing here touches production. Every row is invented for a fictional demo
member ("Alex D."), values are deliberately ordinary, and no series is arranged
to imply an improvement the product promises.
"""

from datetime import date, timedelta

USER_ID = "0d000000-0000-4000-8000-000000000001"
TODAY = date.today()


def d(offset: int) -> str:
    return (TODAY - timedelta(days=offset)).isoformat()


USER = {
    "id": USER_ID,
    "aud": "authenticated",
    "role": "authenticated",
    "email": "demo.member@example.invalid",
    "email_confirmed_at": d(60) + "T10:00:00Z",
    "phone": "",
    "created_at": d(60) + "T10:00:00Z",
    "updated_at": d(0) + "T10:00:00Z",
    "app_metadata": {"provider": "email", "providers": ["email"]},
    "user_metadata": {"first_name": "Alex"},
    "identities": [],
}

SESSION = {
    "access_token": "synthetic.local.only",
    "token_type": "bearer",
    "expires_in": 3600,
    "expires_at": 4102444800,
    "refresh_token": "synthetic-refresh",
    "user": USER,
}

TABLES = {
    "profiles": [
        {
            "user_id": USER_ID,
            "first_name": "Alex",
            "last_name": "D.",
            "timezone": "America/New_York",
            "week_start_day": 1,
            "program_start_date": d(7),
            "deletion_pending": False,
            "deletion_restricted": False,
            "community_display_name": "Alex D.",
            "meal_preferences": {},
            "notification_prefs": {}
        }
    ],
    "user_roles": [],
    "subscriptions": [
        {
            "id": "11111111-1111-4111-8111-111111111111",
            "user_id": USER_ID,
            "status": "active",
            "tier": "membership",
            "current_period_end": d(-20) + "T10:00:00Z",
            "cancel_at_period_end": False,
            "day_number": 8,
            "created_at": d(60) + "T10:00:00Z"
        }
    ],
    "visitor_profiles": [
        {
            "id": "22222222-2222-4222-8222-222222222222",
            "user_id": USER_ID,
            "community_display_name": "Alex D.",
            "level": 3,
            "reset_points": 240,
            "helpful_points": 6,
            "streak_count": 4,
            "badges_earned": [],
            "community_badges_earned": [],
            "getting_started_checklist": {},
            "metadata": {
                "onboarded_at": d(58) + "T10:00:00Z",
                "first_name": "Alex"

            },
            "current_program_phase": 1,
            "served_meals": []
        }
    ],
    "user_streaks": [
        {
            "id": "33333333-3333-4333-8333-333333333333",
            "user_id": USER_ID,
            "current_streak": 4,
            "longest_streak": 6,
            "total_xp": 240,
            "level": 3,
            "helpful_points": 6,
            "last_active_date": d(0)
        }
    ],
    "daily_actions": [
        {
            "id": "44444444-4444-4444-8444-000000000001",
            "day_number": 1,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 1",
            "action_title": "Set up your logging routine",
            "action_description": "Choose the time of day you will record your entries.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Pick a daily time"
                },
                {
                    "id": "s2",
                    "label": "Record one entry today"
                }
            ],
            "learning_objective": "Build a repeatable recording habit."
        },
        {
            "id": "44444444-4444-4444-8444-000000000002",
            "day_number": 2,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 2",
            "action_title": "Fill your water bottle in the morning",
            "action_description": "Start the day with water already poured.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Fill the bottle"
                },
                {
                    "id": "s2",
                    "label": "Log what you drink"
                }
            ],
            "learning_objective": "Make water logging easy to remember."
        },
        {
            "id": "44444444-4444-4444-8444-000000000003",
            "day_number": 3,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 3",
            "action_title": "Use the plate method at one meal",
            "action_description": "Divide one plate into vegetables, protein and carbohydrate.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Choose the meal"
                },
                {
                    "id": "s2",
                    "label": "Log the meal"
                }
            ],
            "learning_objective": "Practise a simple plate layout."
        },
        {
            "id": "44444444-4444-4444-8444-000000000004",
            "day_number": 4,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 4",
            "action_title": "Take a short walk after a meal",
            "action_description": "Walk at a comfortable pace for ten minutes.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Choose the meal"
                },
                {
                    "id": "s2",
                    "label": "Walk for ten minutes"
                }
            ],
            "learning_objective": "Add gentle movement to an existing routine."
        },
        {
            "id": "44444444-4444-4444-8444-000000000005",
            "day_number": 5,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 5",
            "action_title": "Read one guide in Learn",
            "action_description": "Pick any guide that interests you.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Open Learn"
                },
                {
                    "id": "s2",
                    "label": "Read one guide"
                }
            ],
            "learning_objective": "Build background knowledge at your own pace."
        },
        {
            "id": "44444444-4444-4444-8444-000000000006",
            "day_number": 6,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 6",
            "action_title": "Record a fasting glucose reading",
            "action_description": "Record the reading your own routine already includes.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Take the reading"
                },
                {
                    "id": "s2",
                    "label": "Log it in Progress"
                }
            ],
            "learning_objective": "Keep your own records in one place."
        },
        {
            "id": "44444444-4444-4444-8444-000000000007",
            "day_number": 7,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 7",
            "action_title": "Plan tomorrow's meals",
            "action_description": "Look at the week's plan and pick what you will cook.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Open Meals"
                },
                {
                    "id": "s2",
                    "label": "Choose tomorrow's meals"
                }
            ],
            "learning_objective": "Reduce day-of decisions."
        },
        {
            "id": "44444444-4444-4444-8444-000000000008",
            "day_number": 8,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 8",
            "action_title": "Take a 10-minute walk after your largest meal",
            "action_description": "Set a timer and walk at a comfortable pace after the meal you eat the most at today.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Choose which meal you will walk after"
                },
                {
                    "id": "s2",
                    "label": "Walk for 10 minutes"
                }
            ],
            "learning_objective": "Attach movement to your biggest meal of the day."
        },
        {
            "id": "44444444-4444-4444-8444-000000000009",
            "day_number": 9,
            "phase_number": 1,
            "is_extension_day": False,
            "is_active": True,
            "day_name": "Day 9",
            "action_title": "Review your week so far",
            "action_description": "Look back at the entries you have recorded.",
            "action_type": "habit",
            "sub_tasks": [
                {
                    "id": "s1",
                    "label": "Open Progress"
                },
                {
                    "id": "s2",
                    "label": "Note one thing to repeat"
                }
            ],
            "learning_objective": "Reflect using your own records."
        }
    ],
    "member_daily_progress": [
        {
            "id": "55555555-5555-4555-8555-000000000001",
            "member_id": USER_ID,
            "day_number": 1,
            "action_id": "44444444-4444-4444-8444-000000000001",
            "status": "completed",
            "completed_at": d(7) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        },
        {
            "id": "55555555-5555-4555-8555-000000000002",
            "member_id": USER_ID,
            "day_number": 2,
            "action_id": "44444444-4444-4444-8444-000000000002",
            "status": "completed",
            "completed_at": d(6) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        },
        {
            "id": "55555555-5555-4555-8555-000000000003",
            "member_id": USER_ID,
            "day_number": 3,
            "action_id": "44444444-4444-4444-8444-000000000003",
            "status": "completed",
            "completed_at": d(5) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        },
        {
            "id": "55555555-5555-4555-8555-000000000004",
            "member_id": USER_ID,
            "day_number": 4,
            "action_id": "44444444-4444-4444-8444-000000000004",
            "status": "completed",
            "completed_at": d(4) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        },
        {
            "id": "55555555-5555-4555-8555-000000000005",
            "member_id": USER_ID,
            "day_number": 5,
            "action_id": "44444444-4444-4444-8444-000000000005",
            "status": "completed",
            "completed_at": d(3) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        },
        {
            "id": "55555555-5555-4555-8555-000000000006",
            "member_id": USER_ID,
            "day_number": 6,
            "action_id": "44444444-4444-4444-8444-000000000006",
            "status": "completed",
            "completed_at": d(2) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        },
        {
            "id": "55555555-5555-4555-8555-000000000007",
            "member_id": USER_ID,
            "day_number": 7,
            "action_id": "44444444-4444-4444-8444-000000000007",
            "status": "completed",
            "completed_at": d(1) + "T10:00:00Z",
            "sub_tasks_completed": [
                "s1",
                "s2"
            ]
        }
    ],
    "water_logs": [
        {
            "id": "66666666-6666-4666-8666-666666666666",
            "member_id": USER_ID,
            "log_date": d(0),
            "ounces": 24
        }
    ],
    "meal_logs": [
        {
            "id": "77777777-7777-4777-8777-777777777771",
            "member_id": USER_ID,
            "log_date": d(0),
            "meal_type": "breakfast",
            "vegetables": True,
            "protein": True,
            "complex_carbs": True
        },
        {
            "id": "77777777-7777-4777-8777-777777777772",
            "member_id": USER_ID,
            "log_date": d(0),
            "meal_type": "lunch",
            "vegetables": True,
            "protein": True,
            "complex_carbs": False
        }
    ],
    "mindset_reads": [],
    "mood_logs": [],
    "post_meal_walks": [
        {
            "id": "88888888-8888-4888-8888-888888888881",
            "member_id": USER_ID,
            "log_date": d(0),
            "slot": "lunch"
        }
    ],
    "snack_logs": [],
    "snack_library": [
        {
            "id": "99999999-9999-4999-8999-999999999991",
            "name": "Apple with a spoon of peanut butter",
            "description": "A simple option some members keep on hand.",
            "nutritional_note": "Fibre with a source of fat and protein.",
            "timing": "afternoon",
            "type": "snack",
            "unlock_day": 1,
            "sort_order": 1,
            "is_active": True
        }
    ],
    "blood_sugar_readings": [
        {
            "id": "aaaaaaa1-0000-4000-8000-000000000001",
            "member_id": USER_ID,
            "value_mgdl": 118,
            "reading_type": "fasting",
            "measured_at": d(2) + "T10:00:00Z",
            "source": "manual"
        },
        {
            "id": "aaaaaaa1-0000-4000-8000-000000000002",
            "member_id": USER_ID,
            "value_mgdl": 132,
            "reading_type": "post_meal",
            "measured_at": d(1) + "T10:00:00Z",
            "source": "manual"
        },
        {
            "id": "aaaaaaa1-0000-4000-8000-000000000003",
            "member_id": USER_ID,
            "value_mgdl": 121,
            "reading_type": "fasting",
            "measured_at": d(0) + "T10:00:00Z",
            "source": "manual"
        }
    ],
    "a1c_logs": [
        {
            "id": "bbbbbbb1-0000-4000-8000-000000000001",
            "member_id": USER_ID,
            "value_percent": 7.1,
            "measured_on": d(30),
            "source": "lab"
        }
    ],
    "health_logs": [
        {
            "id": "ccccccc1-0000-4000-8000-000000000001",
            "user_id": USER_ID,
            "log_date": d(7),
            "weight": 196,
            "blood_sugar": 124,
            "energy": 3
        },
        {
            "id": "ccccccc1-0000-4000-8000-000000000002",
            "user_id": USER_ID,
            "log_date": d(0),
            "weight": 195,
            "blood_sugar": 121,
            "energy": 4
        }
    ],
    "member_measurements": [
        {
            "id": "ddddddd1-0000-4000-8000-000000000001",
            "member_id": USER_ID,
            "measured_at": d(7) + "T10:00:00Z",
            "waist": 41,
            "hips": 44,
            "chest": 42
        }
    ],
    "workout_sessions": [],
    "workout_completion_receipts": [],
    "meal_plans": [
        {
            "id": "eeeeeee1-0000-4000-8000-000000000001",
            "member_id": USER_ID,
            "plan_type": "week_1",
            "generation_status": "ready",
            "valid_from": d(2),
            "valid_until": d(-5),
            "generated_at": d(2) + "T10:00:00Z",
            "plan_data": {
                "generated_at": d(2) + "T10:00:00Z",
                "meal_timing_version": 2,
                "week_1": {
                    "monday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    },
                    "tuesday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    },
                    "wednesday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    },
                    "thursday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    },
                    "friday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    },
                    "saturday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    },
                    "sunday": {
                        "breakfast": {
                            "name": "Eggs with spinach and tomato",
                            "description": "A quick skillet breakfast.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Eggs",
                                "Spinach",
                                "Tomato",
                                "Olive oil"
                            ],
                            "instructions": [
                                "Warm the oil in a pan.",
                                "Wilt the spinach, add the eggs and cook through."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Spinach and tomato",
                                "protein": "Eggs",
                                "carbs": "Whole-grain toast on the side"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "lunch": {
                            "name": "Chicken and mixed vegetable bowl",
                            "description": "Roasted vegetables with sliced chicken.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "Chicken breast",
                                "Mixed vegetables",
                                "Olive oil",
                                "Brown rice"
                            ],
                            "instructions": [
                                "Roast the vegetables.",
                                "Slice the chicken and serve over rice."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Roasted mixed vegetables",
                                "protein": "Chicken breast",
                                "carbs": "Brown rice"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        },
                        "dinner": {
                            "name": "Baked fish with steamed greens",
                            "description": "Oven-baked white fish.",
                            "prep_time_minutes": 10,
                            "cook_time_minutes": 15,
                            "servings": 1,
                            "ingredients": [
                                "White fish fillet",
                                "Green beans",
                                "Lemon",
                                "Sweet potato"
                            ],
                            "instructions": [
                                "Bake the fish with lemon.",
                                "Steam the green beans and serve."
                            ],
                            "plate_breakdown": {
                                "vegetables": "Green beans",
                                "protein": "White fish",
                                "carbs": "Sweet potato"
                            },
                            "glycemic_rating": "low",
                            "alternatives": []
                        }
                    }
                }
            }
        }
    ],
    "meal_swaps": [],
    "shopping_lists": [],
    "content_items": [
        {
            "id": "fffffff1-0000-4000-8000-000000000001",
            "type": "blog",
            "slug": "understanding-blood-glucose-readings",
            "title": "Understanding blood glucose readings",
            "summary": "What the common reading types mean and how people record them.",
            "body": "",
            "hero_image": None,
            "day_unlock": 1,
            "sort_order": 1,
            "is_active": True,
            "metadata": {
                "url": "https://diabetesresetmethod.com/learn/understanding-blood-glucose-readings",
                "source": "The Diabetes Reset Method"
            },
            "created_at": d(17) + "T10:00:00Z"
        },
        {
            "id": "fffffff1-0000-4000-8000-000000000002",
            "type": "blog",
            "slug": "building-a-walking-habit",
            "title": "Building a walking habit that lasts",
            "summary": "A practical look at making short walks part of an ordinary day.",
            "body": "",
            "hero_image": None,
            "day_unlock": 1,
            "sort_order": 2,
            "is_active": True,
            "metadata": {
                "url": "https://diabetesresetmethod.com/learn/building-a-walking-habit",
                "source": "The Diabetes Reset Method"
            },
            "created_at": d(14) + "T10:00:00Z"
        },
        {
            "id": "fffffff1-0000-4000-8000-000000000003",
            "type": "blog",
            "slug": "reading-a-nutrition-label",
            "title": "Reading a nutrition label without the guesswork",
            "summary": "The few numbers most people find useful, explained plainly.",
            "body": "",
            "hero_image": None,
            "day_unlock": 1,
            "sort_order": 3,
            "is_active": True,
            "metadata": {
                "url": "https://diabetesresetmethod.com/learn/reading-a-nutrition-label",
                "source": "The Diabetes Reset Method"
            },
            "created_at": d(11) + "T10:00:00Z"
        },
        {
            "id": "fffffff1-0000-4000-8000-000000000004",
            "type": "blog",
            "slug": "stress-sleep-and-routine",
            "title": "Stress, sleep and daily routine",
            "summary": "Why routine matters and what to look at first.",
            "body": "",
            "hero_image": None,
            "day_unlock": 1,
            "sort_order": 4,
            "is_active": True,
            "metadata": {
                "url": "https://diabetesresetmethod.com/learn/stress-sleep-and-routine",
                "source": "The Diabetes Reset Method"
            },
            "created_at": d(8) + "T10:00:00Z"
        },
        {
            "id": "fffffff1-0000-4000-8000-000000000005",
            "type": "blog",
            "slug": "preparing-for-a-healthcare-visit",
            "title": "Preparing for a healthcare visit",
            "summary": "How to bring your own records to an appointment.",
            "body": "",
            "hero_image": None,
            "day_unlock": 1,
            "sort_order": 5,
            "is_active": True,
            "metadata": {
                "url": "https://diabetesresetmethod.com/learn/preparing-for-a-healthcare-visit",
                "source": "The Diabetes Reset Method"
            },
            "created_at": d(5) + "T10:00:00Z"
        }
    ],
    "community_questions": [
        {
            "id": "1a000000-0000-4000-8000-000000000001",
            "author_id": "1b000000-0000-4000-8000-000000000001",
            "display_name": "Marcia P.",
            "is_anonymous": False,
            "content": "How do you fit a walk in on work days? I finish late and it is dark. Curious what has worked for other people.",
            "tags": [
                "movement"
            ],
            "author_day_in_program": 22,
            "upvote_count": 4,
            "metoo_count": 2,
            "answer_count": 1,
            "is_verified_answered": True,
            "is_question_of_day": False,
            "created_at": d(3) + "T10:00:00Z"
        },
        {
            "id": "1a000000-0000-4000-8000-000000000002",
            "author_id": "1b000000-0000-4000-8000-000000000002",
            "display_name": "Dev R.",
            "is_anonymous": False,
            "content": "Which meals are easiest to prepare ahead? Looking for simple options I can make on a Sunday.",
            "tags": [
                "meals"
            ],
            "author_day_in_program": 9,
            "upvote_count": 2,
            "metoo_count": 1,
            "answer_count": 0,
            "is_verified_answered": False,
            "is_question_of_day": False,
            "created_at": d(1) + "T10:00:00Z"
        }
    ],
    "community_answers": [
        {
            "id": "1c000000-0000-4000-8000-000000000001",
            "question_id": "1a000000-0000-4000-8000-000000000001",
            "author_id": "1b000000-0000-4000-8000-000000000003",
            "display_name": "Support team",
            "is_admin_response": True,
            "is_vita_response": False,
            "is_anonymous": False,
            "content": "Several members split the walk into two shorter blocks earlier in the day. This is general education, not medical advice.",
            "author_day_in_program": None,
            "helpful_count": 3,
            "is_marked_helpful": True,
            "is_verified": True,
            "created_at": d(2) + "T10:00:00Z"
        }
    ],
    "community_votes": [],
    "win_posts": [],
    "qa_submissions": [],
    "notifications": [],
    "badges": [],
    "user_badges": [],
    "points_ledger": [],
    "activity_events": [],
    "vita_quotes": [
        {
            "id": "1d000000-0000-4000-8000-000000000001",
            "category": "encouragement",
            "quote_text": "Small, repeatable steps are easier to keep than big ones.",
            "is_active": True,
            "day_range_start": 1,
            "day_range_end": 180
        }
    ]
}


RPC = {
    "current_program_day": 8,
    "membership_access_state": "active",
    "member_access_allowed": True,
    "member_write_allowed": True,
    "membership_write_allowed": True,
    "has_role": False,
    "my_deletion_status": [],
}


# --- Post-processing -------------------------------------------------------
# Vary the weekly menu so the Meals preview shows a realistic rotation rather
# than the same three meals repeated for seven days. Synthetic content only.
_MENU = {
    "monday": ("Eggs with spinach and tomato", "Chicken and mixed vegetable bowl", "Baked fish with steamed greens"),
    "tuesday": ("Greek yoghurt with berries and walnuts", "Lentil soup with a green salad", "Turkey chilli with cauliflower rice"),
    "wednesday": ("Vegetable omelette with avocado", "Tuna salad with chickpeas", "Roast chicken with broccoli and quinoa"),
    "thursday": ("Overnight oats with chia and cinnamon", "Grilled chicken wrap with slaw", "Stir-fried beef with peppers and greens"),
    "friday": ("Scrambled eggs with callaloo", "Salmon salad with cucumber", "Curried chickpeas with brown rice"),
    "saturday": ("Cottage cheese with tomato and herbs", "Black bean bowl with peppers", "Baked snapper with steamed vegetables"),
    "sunday": ("Egg and vegetable frittata", "Chicken and kale salad", "Pepperpot-style stew with greens"),
}
for _plan in TABLES["meal_plans"]:
    _week = _plan["plan_data"].get("week_1", {})
    for _day, _names in _MENU.items():
        _slots = _week.get(_day)
        if not _slots:
            continue
        for _slot, _name in zip(("breakfast", "lunch", "dinner"), _names):
            if _slot in _slots:
                _slots[_slot]["name"] = _name

# A fuller (still synthetic) community view for the Ask preview.
TABLES["community_questions"].extend([
    {
        "id": "1a000000-0000-4000-8000-000000000003",
        "author_id": "1b000000-0000-4000-8000-000000000004",
        "display_name": "Karen S.",
        "is_anonymous": False,
        "content": "What do you keep in the house for a quick evening meal when you get home late?",
        "tags": ["meals"],
        "author_day_in_program": 31,
        "upvote_count": 7,
        "metoo_count": 3,
        "answer_count": 2,
        "is_verified_answered": True,
        "is_question_of_day": True,
        "created_at": d(4) + "T09:00:00Z",
    },
    {
        "id": "1a000000-0000-4000-8000-000000000004",
        "author_id": "1b000000-0000-4000-8000-000000000005",
        "display_name": "Anonymous",
        "is_anonymous": True,
        "content": "How do you keep logging going on a busy week without falling behind?",
        "tags": ["habits"],
        "author_day_in_program": 12,
        "upvote_count": 5,
        "metoo_count": 4,
        "answer_count": 1,
        "is_verified_answered": False,
        "is_question_of_day": False,
        "created_at": d(2) + "T18:30:00Z",
    },
])

TABLES["community_answers"].extend([
    {
        "id": "1c000000-0000-4000-8000-000000000002",
        "question_id": "1a000000-0000-4000-8000-000000000003",
        "author_id": "1b000000-0000-4000-8000-000000000006",
        "display_name": "Support team",
        "is_admin_response": True,
        "is_vita_response": False,
        "is_anonymous": False,
        "content": "Members often keep eggs, frozen vegetables and pre-cooked beans on hand so an evening meal takes minutes. General education, not medical advice.",
        "author_day_in_program": None,
        "helpful_count": 6,
        "is_marked_helpful": True,
        "is_verified": True,
        "created_at": d(4) + "T12:00:00Z",
    },
    {
        "id": "1c000000-0000-4000-8000-000000000003",
        "question_id": "1a000000-0000-4000-8000-000000000003",
        "author_id": "1b000000-0000-4000-8000-000000000007",
        "display_name": "Marcia P.",
        "is_anonymous": False,
        "content": "I cook a large pot on Sunday and portion it out. It removes the decision on a late night.",
        "author_day_in_program": 22,
        "helpful_count": 2,
        "is_marked_helpful": False,
        "is_verified": False,
        "created_at": d(3) + "T20:15:00Z",
    },
    {
        "id": "1c000000-0000-4000-8000-000000000004",
        "question_id": "1a000000-0000-4000-8000-000000000004",
        "author_id": "1b000000-0000-4000-8000-000000000008",
        "display_name": "Dev R.",
        "is_anonymous": False,
        "content": "I log at the same moment each evening. Missing a day is fine — I just log the next one.",
        "author_day_in_program": 9,
        "helpful_count": 3,
        "is_marked_helpful": False,
        "is_verified": False,
        "created_at": d(1) + "T21:00:00Z",
    },
])
