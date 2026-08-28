---
name: lead-rag-qualification
description: RAG Lead Qualification & Contractor Tag Matching Pattern. Matches property specifications (roof material, sqft, storm history) against local municipal building codes (TEXAS_IRBC_2024_HAIL) and contractor certification tags (CLASS_4_IMPACT_CERTIFIED_ROOFER).
---

# 🎯 Lead RAG Qualification & Tag Matching Skill

This skill governs automated lead scoring, RAG domain matching, and tier classification using vector knowledge bases.

---

## 🛠️ Workflow Blueprint

1. **Lead Ingestion & Attribute Extraction:**
   - Extract lead budget, geographic location, vehicle/service requested, and timeline.

2. **RAG Domain Knowledge Query (Qdrant / pgvector):**
   - Query inventory or service catalog embeddings for exact semantic matches.

3. **Lead Tiering Output:**
   - **`HOT (Score 80-100)`:** High intent + verified budget -> Trigger instant voice call.
   - **`WARM (Score 50-79)`:** Standard inquiry -> Initiate SMS sequence.
   - **`COLD (Score <50)`:** Nurture campaign.
