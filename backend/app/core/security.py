from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher

# ---------------------------------------------------------------------------
# Password hashing setup
# ---------------------------------------------------------------------------
# PasswordHash is the main pwdlib object. We configure it with a list of
# hashers — the algorithms it supports. We use only Argon2 (the best choice).
#
# Argon2id (the default variant) is:
#   - Memory-hard: forces the attacker to use a lot of RAM, slowing GPU attacks
#   - Time-hard: deliberately slow to compute (not a bug — it's the feature)
#   - The winner of the 2015 Password Hashing Competition
#   - Recommended by OWASP (the web security standards body)
#
# The PasswordHash object is created once at module level and reused.
# This is efficient — there's no state to share between requests.
password_hasher = PasswordHash((Argon2Hasher(),))


def hash_password(password: str) -> str:
    """Hash a plaintext password using Argon2.

    Takes the raw password the user typed and returns a secure Argon2 hash
    string that is safe to store in the database.

    The returned string looks like:
        $argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>

    It contains:
        - The algorithm name and variant (argon2id)
        - The version number
        - The memory (m), time (t), and parallelism (p) parameters
        - The random salt (generated fresh for every hash)
        - The actual hash value

    Args:
        password: The raw plaintext password from the client request.
                  This value must NEVER be stored or logged.

    Returns:
        A secure Argon2 hash string, safe to store in the database.
    """
    return password_hasher.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored Argon2 hash.

    This is used during login: the user sends their password, we retrieve
    the stored hash from the database, and call this function to check
    whether they match — WITHOUT ever decrypting the stored hash
    (which is impossible — hashing is one-way).

    Internally, Argon2 extracts the salt from `hashed_password`, re-hashes
    `password` using that same salt, and compares the results.

    Args:
        password: The raw plaintext password from the login request.
        hashed_password: The Argon2 hash stored in the `users.password_hash` column.

    Returns:
        True if the password matches the hash. False otherwise.
    """
    return password_hasher.verify(password, hashed_password)
