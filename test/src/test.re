let rec fib(x) =
  switch (x) {
  | 0 | 1 => x
  | n => fib(n - 1) + fib(n - 2)
  };

let () = {
  let res = fib(16);
  Js.log(string_of_int(res));
  let x = [1,2,3];
  let x' = List.map(i => i + 1, x);
  List.iter(i => Js.log(string_of_int(i)), x')
}