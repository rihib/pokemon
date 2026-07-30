ALTER TABLE auth_identities ADD COLUMN provider_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS auth_provider_user_idx ON auth_identities(provider, provider_user_id);
