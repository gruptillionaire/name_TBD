-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  username VARCHAR(30) UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_post_date DATE
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_username_lower ON users(LOWER(username));

-- Pins table
CREATE TABLE IF NOT EXISTS pins (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  google_place_id VARCHAR(255),
  city VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_pins_location ON pins USING GIST(location);
CREATE INDEX idx_pins_country ON pins(country);
CREATE INDEX idx_pins_city ON pins(city);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  pin_id UUID REFERENCES pins(id),
  city VARCHAR(100),
  country VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  translated_content JSONB DEFAULT '{}',
  likes INTEGER DEFAULT 0,
  dislikes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_pin_id ON comments(pin_id);
CREATE INDEX idx_comments_country ON comments(country);
CREATE INDEX idx_comments_city ON comments(city);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX idx_comments_score ON comments((likes - dislikes) DESC);

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_votes_user_comment ON votes(user_id, comment_id);
CREATE INDEX idx_votes_comment_id ON votes(comment_id);
