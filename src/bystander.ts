interface IObserver {
  next (val: any);
  error (err: any);
  complete();
}

interface ISubscription {
  (): void;
  unsubscribe();
}

type UnSubscribe = Function | ISubscription

interface IObservableLike {
  subscribe(
    o: IObserver | Function | null,
    error?: Function | null,
    complete?: Function | null
  ) : Function;
}

function noop(val?: any) {};
function createUnsub(f: Function) {
  (f as any).unsubscribe = f;
  return f;
};


export class Observable {
  constructor(private _subscribe: (o: IObserver) => UnSubscribe) {}
  subscribe(o: IObserver | Function | null, errorCallback=noop, completeCallback=noop) {
    if (typeof o === 'function' || o === null) {
      o = o || noop;
      return this._subscribe({
        next: o as any,
        error: errorCallback,
        complete: completeCallback
      });
    }

    const obs = {
      next: o.next ? o.next.bind(o) : noop,
      error: o.error ? o.error.bind(o) : noop,
      complete: o.complete ? o.complete.bind(o) : noop,
    };

    return this._subscribe(obs);
  }

  forEach(f: (item: any) => void ) : Promise<void> {
    return new Promise((resolve, reject) => {
      this._subscribe({
        next: (item) => f(item),
        complete: resolve,
        error: reject
      });
    });
  }

  filter(f: (item: any) => boolean) : Observable {
    return new Observable((obs: IObserver) => {
      const next = (val: any) => {
        if (f(val)) {
          obs.next(val);
        }
      };

      return this._subscribe({
        next,
        error: obs.error.bind(obs),
        complete: obs.complete.bind(obs)
      });
    });
  }

  map(f: (val: any) => any) : Observable {
    return new Observable((obs: IObserver) => {
      return this._subscribe({
        next: (val) => obs.next(f(val)),
        error: obs.error.bind(obs),
        complete: obs.complete.bind(obs)
      });
    });
  }

  reduce(f: (prev: any, curr: any) => any, initVal: any) : Observable {
    let accu = initVal;
    let isFirstVal = true;
    const next = (val: any) => {
      if(!isFirstVal || (isFirstVal && initVal !== undefined)) {
        accu = f(accu, val);
        return;
      }

      accu = val;
      isFirstVal = false;
    };

    return new Observable((obs: IObserver) => {
      return this._subscribe({
        next,
        error: obs.error.bind(obs),
        complete: () => {
          obs.next(accu);
          obs.complete();
        }
      });
    });
  }

  concat(...other) {
    if(!other.every((ob) => typeof ob.subscribe === 'function')) {
      throw new TypeError('all arguments must be observables');
    }

    const totalObs = [this, ...other];
    const length = totalObs.length;
    let totalDone = 0;

    return new Observable(function(obs: IObserver) {
      let sub = noop;
      let observer = {
        next: obs.next.bind(obs),
        error: obs.error.bind(obs),
        complete () {
          totalDone++;
          if (totalDone < length) {
            sub = totalObs[totalDone].subscribe(this);
            return;
          }
          obs.complete();
        }
      };

      // start with first observer
      sub = totalObs[0].subscribe(observer);
      return () => {
        sub();
      };
    });
  }

  static of(...args: Array<any>) : Observable {
    return new Observable(function(obs: IObserver) {
      for(let i=0; i<args.length; i++) {
        obs.next(args[i]);
      }
      obs.complete();
      return noop;
    });
  }

  static from(o: any) : Observable {
    if (typeof (o as IObservableLike).subscribe === 'function') {
      return new Observable(function(obs: IObserver) {
        return (o as IObservableLike).subscribe(obs);
      });
    }

    if (Symbol && Symbol.iterator && o[Symbol.iterator]) {
      return new Observable(function(obs: IObserver) {
        for(let val of o[Symbol.iterator]) {
          obs.next(val);
        }
        obs.complete();
        return noop;
      });
    }

    if (Array.isArray(o)) {
      return new Observable(function(obs: IObserver) {
        const arr = (o as Array<any>);
        for(let i=0; i<arr.length; i++){
          obs.next(arr[i]);
        }
        obs.complete();
        return noop;
      });
    }
    throw new TypeError(`${o.toString()} cannot be converted to an observable`);
  };

  static fromEvent(elem: HTMLElement, eventName: string, options: EventListenerOptions | undefined) : Observable {
    return new Observable(function(obs: IObserver) {
      const handler = function(e: Event) {
        obs.next(e);
      };

      if (options) {
        elem.addEventListener(eventName, handler, options);
      } else {
        elem.addEventListener(eventName, handler);
      }

      return createUnsub(function() {
        elem.removeEventListener(eventName, handler);
      });
    });
  }

  static fromPromise(p: Promise<any>) : Observable {
    return new Observable(function(obs: IObserver) {
      let unSubscribed = false;
      p.then(function(d) {
        if (unSubscribed) { return; }
        obs.next(d);
        obs.complete();
      })
      .catch(function(e) {
        if (unSubscribed) { return; }
        obs.error(e);
      });

      return createUnsub(function() {
        unSubscribed = true;
      });
    });
  }
}
