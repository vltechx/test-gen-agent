using Anthropic;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.SemanticKernel;

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

// ---- 2. Connect Semantic Kernel to Claude ----
// Official Anthropic C# SDK, exposed as a Microsoft.Extensions.AI IChatClient,
// which Semantic Kernel accepts as its chat service.
IChatClient chatClient = new AnthropicClient { ApiKey = apiKey }
    .AsIChatClient("claude-opus-5-5")
    .AsBuilder()
    .UseKernelFunctionInvocation()   // runs the tool calls Claude asks for, then sends back the results
    .Build();

var builder = Kernel.CreateBuilder();
builder.Services.AddChatClient(chatClient);
Kernel kernel = builder.Build();

// ---- 3. Register the tools (plugin) Claude is allowed to call ----
var tools = new TestTools("../sample-ts");
kernel.Plugins.AddFromObject(tools, "TestTools");

// ---- 4. Let Claude drive: automatic function calling ----
var settings = new PromptExecutionSettings
{
    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),   // Claude decides which tools to call
    ExtensionData = new Dictionary<string, object> { ["max_tokens"] = 16000 }
};

var prompt = """
    You are a test-generation agent for a TypeScript project. Use only the TestTools functions.
    1. Read the source file.
    2. Write complete Jest tests (ts-jest) that import from './cart'.
       Cover normal cases, edge cases and thrown errors.
    3. Run the tests. If they fail, fix the TESTS and run them again.
    Rule: if a test fails because the source code itself looks wrong, do NOT change the expected
    value to match the bug. Keep the test and add a comment starting with // POSSIBLE BUG: explaining why.
    When the tests pass, or run_tests says LIMIT REACHED, stop and give a short summary.

    Task: generate and verify tests for cart.ts. Write them to cart.test.ts.
    """;

var reply = await kernel.InvokePromptAsync(prompt, new KernelArguments(settings));

// ---- 5. Report ----
Console.WriteLine("\n==== RESULT ====");
Console.WriteLine($"Passed: {tools.LastRunPassed} after {tools.Runs} run(s)");
Console.WriteLine(reply);
return 0;