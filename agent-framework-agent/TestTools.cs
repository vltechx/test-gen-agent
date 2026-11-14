using System.ComponentModel;
using System.Diagnostics;
using Microsoft.Extensions.AI;

public sealed class TestTools
{
    private readonly string _projectDir;   // path to sample-ts
    private readonly int _maxRuns;

    public int Runs { get; private set; }
    public bool LastRunPassed { get; private set; }

    public TestTools(string projectDir, int maxRuns = 3)
    {
        _projectDir = Path.GetFullPath(projectDir);
        _maxRuns = maxRuns;
    }

    // The three tools Claude may call. AIFunctionFactory reads the [Description] attributes
    // on each method and parameter to build the tool schema.
    public IList<AITool> AsTools() =>
    [
        AIFunctionFactory.Create(ReadSource, name: "read_source"),
        AIFunctionFactory.Create(WriteTests, name: "write_tests"),
        AIFunctionFactory.Create(RunTests, name: "run_tests"),
    ];

    [Description("Reads a TypeScript source file from sample-ts/src and returns its contents.")]
    public string ReadSource(
        [Description("File name inside sample-ts/src, for example cart.ts")] string fileName)
    {
        Console.WriteLine($"[read_source] {fileName}");
        return File.ReadAllText(SafePath(fileName));
    }

    [Description("Writes a complete Jest test file into sample-ts/src. Only *.test.ts files are allowed.")]
    public string WriteTests(
        [Description("Test file name, for example cart.test.ts")] string fileName,
        [Description("The complete TypeScript test file content")] string content)
    {
        if (!fileName.EndsWith(".test.ts"))
            return "REFUSED: only .test.ts files may be written.";

        File.WriteAllText(SafePath(fileName), content);
        Console.WriteLine($"[write_tests] wrote {fileName} ({content.Split('\n').Length} lines)");
        return $"Wrote {fileName}.";
    }

    [Description("Runs the Jest test suite and returns PASSED or FAILED plus the test output.")]
    public string RunTests()
    {
        if (Runs >= _maxRuns)
            return $"LIMIT REACHED: tests already ran {Runs} times. Stop and report the result.";

        Runs++;
        var psi = new ProcessStartInfo("npm", "test -- --ci")
        {
            WorkingDirectory = _projectDir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        using var process = Process.Start(psi)!;
        var stdout = process.StandardOutput.ReadToEndAsync();
        var stderr = process.StandardError.ReadToEndAsync();
        process.WaitForExit();

        var output = stdout.Result + stderr.Result;
        LastRunPassed = process.ExitCode == 0;
        Console.WriteLine($"[run_tests] run {Runs}: {(LastRunPassed ? "PASSED" : "FAILED")}");

        var tail = output.Length > 4000 ? output[^4000..] : output;
        return $"{(LastRunPassed ? "PASSED" : "FAILED")} (run {Runs} of {_maxRuns})\n{tail}";
    }

    // Guardrail: the model can only touch files inside sample-ts/src
    private string SafePath(string fileName)
    {
        var srcDir = Path.GetFullPath(Path.Combine(_projectDir, "src"));
        var fullPath = Path.GetFullPath(Path.Combine(srcDir, fileName));
        if (!fullPath.StartsWith(srcDir + Path.DirectorySeparatorChar))
            throw new InvalidOperationException($"Path outside sample-ts/src: {fileName}");
        return fullPath;
    }
}
