// Examples — one-click sample data per mode so judges/users can see the app
// working without preparing their own input. Each example is self-contained
// and known to succeed on the free model, so demos never flake on bad data.

export const EXAMPLES = {
  csv: {
    label: 'Try example',
    inputs: {
      file: 'name,age,score\nAlice,30,88\nBob,25,72\nCarol,35,95\nDave,28,81\nEve,32,67\n',
      question: 'What is the average score? Show the top 3 rows.',
    },
  },
  chart: {
    label: 'Try example',
    inputs: {
      data: 'month,revenue\nJan,120\nFeb,150\nMar,90\nApr,200\nMay,175\nJun,220\n',
      request: 'Bar chart of revenue by month with a gradient feel',
      format: 'png',
      palette: 'aurora',
      chart_type: 'bar',
    },
  },
  coder: {
    label: 'Try example',
    inputs: {
      file: 'def average(nums):\n    total = 0\n    for n in nums\n        total += n\n    return total / len(nums)\n\nprint(average([10, 20, 30]))\n',
      goal: 'average() returns the mean of a list, and returns 0 for an empty list.',
      test: 'from input_file import average\nassert average([10, 20, 30]) == 20\nassert average([]) == 0\nprint("ALL TESTS PASSED")',
    },
  },
  fix: {
    label: 'Try example',
    inputs: {
      file: 'def greet(name):\n    print("Hello " + name)\n\ngreet("world")\n',
      desired: 'greet("world") should print "Hello world" and return the greeting string.',
    },
  },
}
