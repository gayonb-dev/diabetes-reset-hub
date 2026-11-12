# Architecture rules

- Classify clinical-review populations from server-owned complimentary grants, including pending and ended grants, and fail closed when classification fails, so scheduled messages never rely on client flags.
- Use the shared personal-data inventory for reviewer export and deletion, with administrative actor fields redacted, to keep lifecycle consumers consistent.
- Reviewer content policies must combine the canonical safety evaluator with original visibility predicates, because an additive permissive policy otherwise bypasses safety restrictions.