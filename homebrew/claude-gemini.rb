class ClaudeGemini < Formula
  desc "Global CLI for Claude-Gemini integration across projects"
  homepage "https://github.com/claude-gemini/claude-gemini-cli"
  url "https://github.com/claude-gemini/claude-gemini-cli/archive/v1.0.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256"
  license "MIT"

  depends_on "node"
  depends_on "ripgrep" => :recommended
  depends_on "coreutils" => :recommended  # For gtimeout on macOS

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    system "npm", "run", "build"
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  def post_install
    # Create global config directory
    (var/"claude-gemini").mkpath
    
    # Show setup instructions
    ohai "Claude-Gemini CLI installed successfully!"
    ohai "Quick start:"
    ohai "  1. Initialize in your project: cg init"
    ohai "  2. Test it: cg \"@package.json What is this?\""
    ohai "  3. See help: cg --help"
  end

  test do
    system "#{bin}/cg", "--version"
  end
end