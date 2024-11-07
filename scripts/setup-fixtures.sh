#!/bin/bash

# Base directories
FIXTURES_DIR="test/fixtures/scss"
VENDOR_DIR="$FIXTURES_DIR/vendor"
APP_DIR="$FIXTURES_DIR/app/assets/stylesheets"
LIB_DIR="$FIXTURES_DIR/lib"
COMPONENTS_DIR="$FIXTURES_DIR/components"

# Create directory structure
mkdir -p "$VENDOR_DIR/lib"
mkdir -p "$APP_DIR/components"
mkdir -p "$LIB_DIR"
mkdir -p "$COMPONENTS_DIR"

# Create base SCSS files
cat > "$FIXTURES_DIR/basic.scss" << 'EOF'
.test-component {
    background: #fff;
    padding: 20px;
}
EOF

cat > "$FIXTURES_DIR/_variables.scss" << 'EOF'
$primary-color: #ff8100;
$font-family-base: "myriad-pro", sans-serif;
EOF

cat > "$FIXTURES_DIR/_mixins.scss" << 'EOF'
@mixin center {
    display: flex;
    align-items: center;
    justify-content: center;
}
EOF

# Create component files
cat > "$COMPONENTS_DIR/_header.scss" << 'EOF'
.header {
    background: $primary-color;
}
EOF

cat > "$COMPONENTS_DIR/_footer.scss" << 'EOF'
.footer {
    color: $primary-color;
}
EOF

# Create library files
cat > "$LIB_DIR/select2.scss" << 'EOF'
.select2 {
    display: inline-block;
}
EOF

cat > "$LIB_DIR/select2.css" << 'EOF'
.select2 {
    display: inline-block;
}
EOF

# Create vendor files
cat > "$VENDOR_DIR/lib/select2.scss" << 'EOF'
.select2-vendor {
    display: block;
}
EOF

# Create circular dependency test files
cat > "$FIXTURES_DIR/circular-a.scss" << 'EOF'
// = require "circular-b"
.circular-a {
    color: red;
}
EOF

cat > "$FIXTURES_DIR/circular-b.scss" << 'EOF'
// = require "circular-a"
.circular-b {
    color: blue;
}
EOF

# Create test files with requires
cat > "$FIXTURES_DIR/with-requires.scss" << 'EOF'
// = require '_variables'
// = require '_mixins'
// = require_tree './components'

.main {
    @include center;
    background: $primary-color;
    font-family: $font-family-base;
}
EOF

echo "Fixtures setup complete!" 