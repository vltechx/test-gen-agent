using Anthropic;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;

// ---- 1. Load ANTHROPIC_API_KEY from the repo's .env file (one folder up) ----
var envPath = Path.Combine("..", ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        if (line.TrimStart().StartsWith('#')) continue;
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
            Environment.SetEnvironmentVariable(parts[0].Trim(), parts[1].Trim().Trim('"'));
    }
}

var apiKey = Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");
if (string.IsNullOrWhiteSpace(apiKey))
{
    Console.Error.WriteLine("ANTHROPIC_API_KEY is not set. Check the repo's .env file.");
    return 1;
}

// ---- 2. Create the Claude chat client ----
// Official Anthropic C# SDK, exposed as a Microsoft.Extensions.AI IChatClient.
IChatClient chatClient = new AnthropicClient { ApiKey = apiKey }
    .AsIChatClient("claude-opus-5-5");

// ---- 3. Build the Agent Framework agent with the three tools ----
var tools = new TestTools("../sample-ts");

var instructions = """
    You are a test-generation agent for a TypeScript project. Use only the provided tools.
    1. Read the source file.
    2. Write complete Jest tests (ts-jest) that import from './cart'.
       Cover normal cases, edge cases and thrown errors.
    3. Run the tests. If they fail, fix the TESTS and run them again.
    Rule: if a test fails because the source code itself looks wrong, do NOT change the expected
    value to match the bug. Keep the test and add a comment starting with // POSSIBLE BUG: explaining why.
    When the tests pass, or run_tests says LIMIT REACHED, stop and give a short summary.
    """;

// ChatClientAgent adds automatic function invocation to the chat client by default,
// so Claude's tool calls are executed and their results sent back without extra code.
AIAgent agent = chatClient.AsAIAgent(new ChatClientAgentOptions
{
    Name = "TestGenerationAgent",
    ChatOptions = new ChatOptions
    {
        Instructions = instructions,
        Tools = tools.AsTools(),
        MaxOutputTokens = 16000,
    },
});

// ---- 4. Run the agent once ----
AgentResponse reply = await agent.RunAsync(
    "Task: generate and verify tests for cart.ts. Write them to cart.test.ts.");

// ---- 5. Report ----
Console.WriteLine("\n==== RESULT ====");
Console.WriteLine($"Passed: {tools.LastRunPassed} after {tools.Runs} run(s)");
Console.WriteLine(reply.Text);
return 0;
